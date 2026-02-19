package services

import (
	"encoding/base64"
	"fmt"
	"time"

	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
	"inovar/internal/infra/config"
)

// DANFSeService generates DANFS-e (Documento Auxiliar da NFS-e)
type DANFSeService struct {
	config *config.Config
}

// DANFSeData contains all data needed to generate DANFS-e
type DANFSeData struct {
	// Company (Prestador)
	PrestadorNome     string
	PrestadorCNPJ     string
	PrestadorIM       string
	PrestadorEndereco string
	PrestadorCidade   string
	PrestadorUF       string
	PrestadorTelefone string
	PrestadorEmail    string
	PrestadorLogo     string // Base64 or URL

	// NFS-e Info
	NumeroNFSe        string
	CodigoVerificacao string
	DataEmissao       string
	DataCompetencia   string
	ChaveAcesso       string
	Ambiente          string

	// Tomador (Cliente)
	TomadorNome      string
	TomadorDocumento string
	TomadorEndereco  string
	TomadorCidade    string
	TomadorUF        string
	TomadorEmail     string

	// Serviço
	Discriminacao string
	CodigoServico string
	CNAE          string

	// Valores
	ValorServicos string
	ValorDeducoes string
	ValorLiquido  string
	AliquotaISS   string
	ValorISS      string
	ISSRetido     bool
	ValorPIS      string
	ValorCOFINS   string
	ValorCSLL     string
	ValorIR       string
	ValorINSS     string

	// Extras
	LinkVerificacao   string
	QRCodeVerificacao string
}

// NewDANFSeService creates a new DANFS-e generator
func NewDANFSeService(cfg *config.Config) *DANFSeService {
	return &DANFSeService{config: cfg}
}

// Generate creates the DANFS-e HTML that can be converted to PDF
func (s *DANFSeService) Generate(nfse *domain.NotaFiscal, prestador *domain.Prestador, tomador *domain.Cliente) (string, error) {
	// Build data
	data := DANFSeData{
		PrestadorNome:     prestador.RazaoSocial,
		PrestadorCNPJ:     formatCNPJ(prestador.CNPJ),
		PrestadorEndereco: buildEndereco(prestador.Endereco),
		PrestadorLogo:     prestador.LogoURL,

		NumeroNFSe:        nfse.Numero,
		CodigoVerificacao: nfse.CodigoVerificacao,
		DataEmissao:       formatDate(nfse.DataEmissao),
		DataCompetencia:   formatDate(&nfse.DataCompetencia),
		ChaveAcesso:       nfse.XMLPath, // Stored as access key

		TomadorNome:      nfse.TomadorNome,
		TomadorDocumento: formatDocument(nfse.TomadorDocumento),
		TomadorEndereco:  nfse.TomadorEndereco,

		Discriminacao: nfse.Discriminacao,
		CodigoServico: nfse.CodigoServico,

		ValorServicos: formatMoney(nfse.ValorServicos),
		ValorDeducoes: formatMoney(nfse.ValorDeducoes),
		ValorLiquido:  formatMoney(nfse.ValorLiquido),
		AliquotaISS:   fmt.Sprintf("%.2f%%", nfse.AliquotaISS),
		ValorISS:      formatMoney(nfse.ValorISS),
		ValorPIS:      formatMoney(nfse.ValorPIS),
		ValorCOFINS:   formatMoney(nfse.ValorCOFINS),
		ValorCSLL:     formatMoney(nfse.ValorCSLL),
		ValorIR:       formatMoney(nfse.ValorIR),
		ValorINSS:     formatMoney(nfse.ValorINSS),
		CNAE:          nfse.CNAE,

		Ambiente:        "Produção",
		LinkVerificacao: fmt.Sprintf("https://nfse.gov.br/consulta?chave=%s", nfse.CodigoVerificacao),
	}

	// Generate HTML from template
	html, err := s.renderHTML(data)
	if err != nil {
		return "", err
	}

	return html, nil
}

// SavePDF generates the DANFS-e HTML (PDF conversion can be done client-side)
func (s *DANFSeService) SavePDF(nfse *domain.NotaFiscal, prestador *domain.Prestador, tomador *domain.Cliente) (string, error) {
	html, err := s.Generate(nfse, prestador, tomador)
	if err != nil {
		return "", err
	}

	// Return HTML content directly (no local file storage)
	// PDF conversion can be handled client-side or via a cloud service
	return html, nil
}

func (s *DANFSeService) renderHTML(data DANFSeData) (string, error) {
	resp, err := bridge.CallPython("render_danfse", map[string]interface{}{
		"data": data,
	})
	if err != nil {
		return "", err
	}

	html, ok := resp.Data["html"].(string)
	if !ok {
		return "", fmt.Errorf("invalid response from bridge: missing html")
	}

	return html, nil
}

// Helper functions
func formatCNPJ(cnpj string) string {
	if len(cnpj) != 14 {
		return cnpj
	}
	return fmt.Sprintf("%s.%s.%s/%s-%s",
		cnpj[0:2], cnpj[2:5], cnpj[5:8], cnpj[8:12], cnpj[12:14])
}

func formatDocument(doc string) string {
	if len(doc) == 11 {
		return fmt.Sprintf("%s.%s.%s-%s", doc[0:3], doc[3:6], doc[6:9], doc[9:11])
	}
	return formatCNPJ(doc)
}

func formatDate(t *time.Time) string {
	if t == nil {
		return "-"
	}
	return t.Format("02/01/2006 15:04")
}

func formatMoney(value float64) string {
	return fmt.Sprintf("R$ %.2f", value)
}

func buildEndereco(end *domain.Endereco) string {
	if end == nil {
		return ""
	}
	return fmt.Sprintf("%s, %s - %s, %s/%s",
		end.Street, end.Number, end.District, end.City, end.State)
}

// DANFSeTemplate is now handled by the Python bridge

// GetDANFSeAsBase64 returns the DANFS-e HTML encoded as Base64
func (s *DANFSeService) GetDANFSeAsBase64(nfse *domain.NotaFiscal, prestador *domain.Prestador, tomador *domain.Cliente) (string, error) {
	html, err := s.Generate(nfse, prestador, tomador)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString([]byte(html)), nil
}
