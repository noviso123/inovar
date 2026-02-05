package services

import (
	"bytes"
	"compress/gzip"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/inovar/backend/internal/config"
)

// NFSeNacionalService handles NFS-e Nacional (GOV.BR) integration
type NFSeNacionalService struct {
	config     *config.Config
	httpClient *http.Client
	ambiente   string // PRODUCAO or HOMOLOGACAO
}

// API Endpoints
const (
	NFSeURLProducao     = "https://sefin.nfse.gov.br/SefinNacional"
	NFSeURLHomologacao  = "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
	AmbienteProducao    = "PRODUCAO"
	AmbienteHomologacao = "HOMOLOGACAO"
)

// DPS - Declaração Prévia de Serviços (input for generating NFS-e)
type DPS struct {
	XMLName xml.Name `xml:"DPS" json:"-"`
	InfDPS  InfDPS   `xml:"infDPS" json:"infDPS"`
}

type InfDPS struct {
	ID        string        `xml:"Id,attr" json:"id"`
	TpAmb     int           `xml:"tpAmb" json:"tpAmb"`       // 1=Produção, 2=Homologação
	DhEmi     string        `xml:"dhEmi" json:"dhEmi"`       // Data/hora emissão ISO8601
	VerAplic  string        `xml:"verAplic" json:"verAplic"` // Versão do aplicativo
	SeriesDPS string        `xml:"serie" json:"serie"`       // Série do DPS
	NumDPS    int64         `xml:"nDPS" json:"nDPS"`         // Número do DPS
	DCompet   string        `xml:"dCompet" json:"dCompet"`   // Data de competência
	TpEmit    int           `xml:"tpEmit" json:"tpEmit"`     // Tipo emitente
	CLocEmi   int           `xml:"cLocEmi" json:"cLocEmi"`   // Código município emissão (IBGE)
	TpOp      int           `xml:"tpOp" json:"tpOp"`         // 1=Dentro Mun, 2=Fora, 3=Exportação
	Subst     *Substituicao `xml:"subst,omitempty" json:"subst,omitempty"`
	Prest     Prestador     `xml:"prest" json:"prest"`     // Prestador
	Toma      Tomador       `xml:"toma" json:"toma"`       // Tomador (cliente)
	Serv      Servico       `xml:"serv" json:"serv"`       // Serviço
	Valores   Valores       `xml:"valores" json:"valores"` // Valores
}

type Substituicao struct {
	ChNFSeSubst string `xml:"chNFSeSubst" json:"chNFSeSubst"` // Chave NFS-e a substituir
}

type Prestador struct {
	CNPJ string `xml:"CNPJ" json:"CNPJ"`
	IM   string `xml:"IM,omitempty" json:"IM,omitempty"` // Inscrição Municipal
}

type Tomador struct {
	CNPJ  string       `xml:"CNPJ,omitempty" json:"CNPJ,omitempty"`
	CPF   string       `xml:"CPF,omitempty" json:"CPF,omitempty"`
	NIF   string       `xml:"NIF,omitempty" json:"NIF,omitempty"` // Estrangeiro
	XNome string       `xml:"xNome" json:"xNome"`
	End   EnderecoNFSe `xml:"end,omitempty" json:"end,omitempty"`
	Fone  string       `xml:"fone,omitempty" json:"fone,omitempty"`
	Email string       `xml:"email,omitempty" json:"email,omitempty"`
}

type EnderecoNFSe struct {
	XLgr    string `xml:"xLgr" json:"xLgr"`                     // Logradouro
	Nro     string `xml:"nro" json:"nro"`                       // Número
	XCpl    string `xml:"xCpl,omitempty" json:"xCpl,omitempty"` // Complemento
	XBairro string `xml:"xBairro" json:"xBairro"`               // Bairro
	CMun    int    `xml:"cMun" json:"cMun"`                     // Código IBGE município
	UF      string `xml:"UF" json:"UF"`
	CEP     string `xml:"CEP" json:"CEP"`
}

type Servico struct {
	CLocPrestacao     int    `xml:"cLocPrestacao" json:"cLocPrestacao"` // Código IBGE local prestação
	CServ             CServ  `xml:"cServ" json:"cServ"`                 // Código serviço
	DiscriminacaoServ string `xml:"xDescServ" json:"xDescServ"`         // Descrição detalhada
}

type CServ struct {
	CodTribNac string `xml:"cTribNac" json:"cTribNac"`                     // Código tributação nacional
	CodTribMun string `xml:"cTribMun,omitempty" json:"cTribMun,omitempty"` // Código municipal
	CNAE       string `xml:"CNAE,omitempty" json:"CNAE,omitempty"`
	XDescServ  string `xml:"xDescServ,omitempty" json:"xDescServ,omitempty"` // Descrição serviço
}

type Valores struct {
	VServPrest  ValorServPrest   `xml:"vServPrest" json:"vServPrest"`
	VDescIncond float64          `xml:"vDescIncond,omitempty" json:"vDescIncond,omitempty"` // Desconto
	VTDC        *ValorTribDedCon `xml:"vTDC,omitempty" json:"vTDC,omitempty"`
}

type ValorServPrest struct {
	VReceb float64 `xml:"vReceb" json:"vReceb"` // Valor a receber
}

type ValorTribDedCon struct {
	VBaseCalc  float64 `xml:"vBC" json:"vBC"`               // Base de cálculo
	PAliqTot   float64 `xml:"pAliqAplic" json:"pAliqAplic"` // Alíquota total
	VISSQNCalc float64 `xml:"vISSQN" json:"vISSQN"`         // Valor ISSQN calculado
	TISSQN     int     `xml:"tISSQN" json:"tISSQN"`         // Tipo ISSQN (1=Operação normal)
	VRetPIS    float64 `xml:"vRetPIS,omitempty" json:"vRetPIS,omitempty"`
	VRetCOFINS float64 `xml:"vRetCOFINS,omitempty" json:"vRetCOFINS,omitempty"`
	VRetCSLL   float64 `xml:"vRetCSLL,omitempty" json:"vRetCSLL,omitempty"`
	VRetIR     float64 `xml:"vRetIR,omitempty" json:"vRetIR,omitempty"`
	VRetINSS   float64 `xml:"vRetINSS,omitempty" json:"vRetINSS,omitempty"`
}

// NFSeResponse - Response from NFS-e Nacional API
type NFSeResponse struct {
	ChaveAcesso       string `json:"chaveAcesso"`
	NumeroNFSe        string `json:"numero"`
	CodigoVerificacao string `json:"codVerif"`
	DataEmissao       string `json:"dhEmi"`
	XMLBase64         string `json:"nfseXmlGZipB64"` // NFS-e XML compactado em GZip + Base64
	Status            string `json:"status"`
	Mensagem          string `json:"mensagem,omitempty"`
}

type APIError struct {
	Codigo   string `json:"codigo"`
	Mensagem string `json:"mensagem"`
	Campo    string `json:"campo,omitempty"`
}

type APIResponse struct {
	Sucesso bool          `json:"sucesso"`
	Data    *NFSeResponse `json:"data,omitempty"`
	Erros   []APIError    `json:"erros,omitempty"`
}

// NewNFSeNacionalService creates a new NFS-e Nacional service instance
func NewNFSeNacionalService(cfg *config.Config, ambiente string) *NFSeNacionalService {
	return &NFSeNacionalService{
		config:   cfg,
		ambiente: ambiente,
	}
}

// ConfigureMTLS configures the HTTP client with mTLS using certificate
func (s *NFSeNacionalService) ConfigureMTLS(certPath, certPassword string) error {
	// Load certificate
	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		return fmt.Errorf("erro ao ler certificado: %v", err)
	}

	// Parse P12/PFX certificate (ICP-Brasil A1)
	// In production, use proper P12 parsing library
	// For now, assuming PEM format for simplicity

	cert, err := tls.X509KeyPair(certPEM, certPEM)
	if err != nil {
		return fmt.Errorf("erro ao parsear certificado: %v", err)
	}

	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(certPEM)

	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caCertPool,
		MinVersion:   tls.VersionTLS12,
	}

	s.httpClient = &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 60 * time.Second,
	}

	return nil
}

// GetBaseURL returns the API base URL based on environment
func (s *NFSeNacionalService) GetBaseURL() string {
	if s.ambiente == AmbienteProducao {
		return NFSeURLProducao
	}
	return NFSeURLHomologacao
}

// EmitirNFSe emits a new NFS-e from DPS
func (s *NFSeNacionalService) EmitirNFSe(dps *DPS) (*NFSeResponse, error) {
	if s.httpClient == nil {
		return nil, fmt.Errorf("HTTP client não configurado. Configure mTLS primeiro.")
	}

	// Set environment in DPS
	if s.ambiente == AmbienteProducao {
		dps.InfDPS.TpAmb = 1
	} else {
		dps.InfDPS.TpAmb = 2
	}

	// Marshal DPS to XML
	xmlBytes, err := xml.MarshalIndent(dps, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar DPS: %v", err)
	}

	// Add XML declaration
	xmlData := []byte(xml.Header + string(xmlBytes))

	// Compress with GZip
	var gzipBuffer bytes.Buffer
	gzipWriter := gzip.NewWriter(&gzipBuffer)
	_, err = gzipWriter.Write(xmlData)
	if err != nil {
		return nil, fmt.Errorf("erro ao comprimir XML: %v", err)
	}
	gzipWriter.Close()

	// Encode to Base64
	xmlBase64 := base64.StdEncoding.EncodeToString(gzipBuffer.Bytes())

	// Prepare request body
	requestBody := map[string]string{
		"dpsXmlGZipB64": xmlBase64,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar request: %v", err)
	}

	// Make API request
	url := s.GetBaseURL() + "/nfse"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler resposta: %v", err)
	}

	// Parse response
	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("erro ao parsear resposta: %v", err)
	}

	if !apiResp.Sucesso {
		errMsgs := ""
		for _, e := range apiResp.Erros {
			errMsgs += fmt.Sprintf("[%s] %s. ", e.Codigo, e.Mensagem)
		}
		return nil, fmt.Errorf("erro SEFAZ: %s", errMsgs)
	}

	return apiResp.Data, nil
}

// ConsultarNFSe queries an existing NFS-e by access key
func (s *NFSeNacionalService) ConsultarNFSe(chaveAcesso string) (*NFSeResponse, error) {
	if s.httpClient == nil {
		return nil, fmt.Errorf("HTTP client não configurado")
	}

	url := fmt.Sprintf("%s/nfse/%s", s.GetBaseURL(), chaveAcesso)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %v", err)
	}

	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler resposta: %v", err)
	}

	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("erro ao parsear resposta: %v", err)
	}

	if !apiResp.Sucesso {
		return nil, fmt.Errorf("NFS-e não encontrada")
	}

	return apiResp.Data, nil
}

// CancelarNFSe cancels an existing NFS-e
func (s *NFSeNacionalService) CancelarNFSe(chaveAcesso, motivo string) error {
	if s.httpClient == nil {
		return fmt.Errorf("HTTP client não configurado")
	}

	requestBody := map[string]string{
		"chaveAcesso": chaveAcesso,
		"cMotivo":     "1", // Código do motivo
		"xMotivo":     motivo,
	}

	jsonBody, _ := json.Marshal(requestBody)

	url := s.GetBaseURL() + "/nfse/cancelar"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("erro ao criar request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro na requisição: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("erro ao parsear resposta: %v", err)
	}

	if !apiResp.Sucesso {
		errMsgs := ""
		for _, e := range apiResp.Erros {
			errMsgs += fmt.Sprintf("[%s] %s. ", e.Codigo, e.Mensagem)
		}
		return fmt.Errorf("erro ao cancelar: %s", errMsgs)
	}

	return nil
}

// DecodeNFSeXML decodes the Base64+GZip XML from API response
func DecodeNFSeXML(xmlBase64 string) ([]byte, error) {
	// Decode Base64
	gzipData, err := base64.StdEncoding.DecodeString(xmlBase64)
	if err != nil {
		return nil, fmt.Errorf("erro ao decodificar Base64: %v", err)
	}

	// Decompress GZip
	gzipReader, err := gzip.NewReader(bytes.NewReader(gzipData))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar leitor GZip: %v", err)
	}
	defer gzipReader.Close()

	xmlData, err := io.ReadAll(gzipReader)
	if err != nil {
		return nil, fmt.Errorf("erro ao descomprimir GZip: %v", err)
	}

	return xmlData, nil
}

func BuildDPSFromRequest(
	prestadorCNPJ string,
	prestadorIM string,
	tomadorDoc string,
	tomadorNome string,
	tomadorEndereco EnderecoNFSe,
	discriminacao string,
	codigoServico string,
	valor float64,
	codMunicipioEmissao int,
	codMunicipioPrestacao int,
	naturezaOperacao string,
	cnae string,
) *DPS {
	now := time.Now()

	// Default Op Type based on nature
	tpOp := 1 // Dentro muni
	if naturezaOperacao == "TRIBUTACAO_FORA_MUNICIPIO" {
		tpOp = 2
	}

	dps := &DPS{
		InfDPS: InfDPS{
			ID:        fmt.Sprintf("DPS%d", now.UnixNano()),
			DhEmi:     now.Format(time.RFC3339),
			VerAplic:  "INOVAR_1.0",
			SeriesDPS: "NFS",
			NumDPS:    now.UnixNano() / 1000000,
			DCompet:   now.Format("2006-01-02"),
			TpEmit:    1, // Prestador
			CLocEmi:   codMunicipioEmissao,
			TpOp:      tpOp,
			Prest: Prestador{
				CNPJ: prestadorCNPJ,
				IM:   prestadorIM,
			},
			Toma: Tomador{
				XNome: tomadorNome,
				End:   tomadorEndereco,
			},
			Serv: Servico{
				CLocPrestacao: codMunicipioPrestacao,
				CServ: CServ{
					CodTribNac: codigoServico,
					CNAE:       cnae,
				},
				DiscriminacaoServ: discriminacao,
			},
			Valores: Valores{
				VServPrest: ValorServPrest{
					VReceb: valor,
				},
				VTDC: &ValorTribDedCon{
					VBaseCalc: valor,
					TISSQN:    1, // Normal
				},
			},
		},
	}

	// Set document (CPF or CNPJ)
	if len(tomadorDoc) == 11 {
		dps.InfDPS.Toma.CPF = tomadorDoc
	} else if len(tomadorDoc) == 14 {
		dps.InfDPS.Toma.CNPJ = tomadorDoc
	}

	return dps
}

// GetCodigoMunicipioIBGE returns IBGE code for known cities
func GetCodigoMunicipioIBGE(cidade, uf string) int {
	// Common cities in ES (Espírito Santo)
	codigos := map[string]int{
		"SERRA-ES":      3205002,
		"VITORIA-ES":    3205309,
		"VILA VELHA-ES": 3205200,
		"CARIACICA-ES":  3201308,
		"VIANA-ES":      3205101,
		"GUARAPARI-ES":  3202405,
	}

	key := fmt.Sprintf("%s-%s", cidade, uf)
	if cod, ok := codigos[key]; ok {
		return cod
	}

	log.Printf("⚠️ Código IBGE não encontrado para %s-%s", cidade, uf)
	return 0
}
