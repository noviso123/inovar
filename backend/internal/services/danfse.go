package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"time"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/models"
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
func (s *DANFSeService) Generate(nfse *models.NotaFiscal, prestador *models.Prestador, tomador *models.Cliente) (string, error) {
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

// SavePDF saves the DANFS-e as PDF (using html2pdf or similar)
func (s *DANFSeService) SavePDF(nfse *models.NotaFiscal, prestador *models.Prestador, tomador *models.Cliente) (string, error) {
	html, err := s.Generate(nfse, prestador, tomador)
	if err != nil {
		return "", err
	}

	// Create storage directory
	pdfDir := filepath.Join(s.config.UploadDir, "nfse", nfse.PrestadorID)
	if err := os.MkdirAll(pdfDir, 0755); err != nil {
		return "", err
	}

	// Save HTML for now (PDF conversion requires wkhtmltopdf or similar)
	filename := fmt.Sprintf("danfse_%s.html", nfse.Numero)
	htmlPath := filepath.Join(pdfDir, filename)

	if err := os.WriteFile(htmlPath, []byte(html), 0644); err != nil {
		return "", err
	}

	return htmlPath, nil
}

// renderHTML generates HTML from template
func (s *DANFSeService) renderHTML(data DANFSeData) (string, error) {
	tmpl := template.Must(template.New("danfse").Parse(danfseTemplate))

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
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

func buildEndereco(end *models.Endereco) string {
	if end == nil {
		return ""
	}
	return fmt.Sprintf("%s, %s - %s, %s/%s",
		end.Street, end.Number, end.District, end.City, end.State)
}

// HTML Template for DANFS-e
const danfseTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DANFS-e - NFS-e Nº {{.NumeroNFSe}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border: 2px solid #000;
            padding: 15px;
            margin-bottom: 10px;
        }
        .logo-section {
            flex: 0 0 120px;
        }
        .logo {
            max-width: 100px;
            max-height: 60px;
        }
        .title-section {
            flex: 1;
            text-align: center;
        }
        .title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 10px;
            color: #666;
        }
        .nfse-number {
            flex: 0 0 180px;
            text-align: right;
        }
        .nfse-number .number {
            font-size: 18px;
            font-weight: bold;
            color: #0066cc;
        }
        .section {
            border: 1px solid #ccc;
            margin-bottom: 10px;
            padding: 10px;
        }
        .section-title {
            font-weight: bold;
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
        }
        .row {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 5px;
        }
        .field {
            flex: 1;
            min-width: 150px;
            margin-right: 10px;
        }
        .field-label {
            font-size: 9px;
            color: #999;
            text-transform: uppercase;
        }
        .field-value {
            font-weight: 600;
        }
        .discriminacao {
            white-space: pre-wrap;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            font-size: 11px;
        }
        .valores-table {
            width: 100%;
            border-collapse: collapse;
        }
        .valores-table td {
            padding: 5px 10px;
            border: 1px solid #ddd;
        }
        .valores-table .label {
            background: #f5f5f5;
            font-weight: 600;
            width: 70%;
        }
        .valores-table .value {
            text-align: right;
            font-weight: bold;
        }
        .total-row {
            background: #0066cc !important;
            color: white;
        }
        .total-row .label,
        .total-row .value {
            background: transparent;
            color: white;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
        }
        .verification {
            background: #f0f7ff;
            border: 1px solid #0066cc;
            padding: 10px;
            text-align: center;
            margin-top: 10px;
        }
        .verification-code {
            font-family: monospace;
            font-size: 14px;
            font-weight: bold;
            color: #0066cc;
        }
        .gov-badge {
            display: inline-block;
            background: #1351b4;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        @media print {
            body { padding: 0; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="logo-section">
            {{if .PrestadorLogo}}
            <img src="{{.PrestadorLogo}}" alt="Logo" class="logo">
            {{end}}
        </div>
        <div class="title-section">
            <div class="title">DANFS-e</div>
            <div class="subtitle">Documento Auxiliar da Nota Fiscal de Serviço Eletrônica</div>
            <div style="margin-top: 5px;">
                <span class="gov-badge">NFS-e NACIONAL GOV.BR</span>
            </div>
        </div>
        <div class="nfse-number">
            <div class="field-label">Número da NFS-e</div>
            <div class="number">{{.NumeroNFSe}}</div>
            <div style="font-size: 9px; color: #666;">{{.DataEmissao}}</div>
        </div>
    </div>

    <!-- Prestador -->
    <div class="section">
        <div class="section-title">Prestador de Serviços</div>
        <div class="row">
            <div class="field" style="flex: 2;">
                <div class="field-label">Razão Social</div>
                <div class="field-value">{{.PrestadorNome}}</div>
            </div>
            <div class="field">
                <div class="field-label">CNPJ</div>
                <div class="field-value">{{.PrestadorCNPJ}}</div>
            </div>
        </div>
        <div class="row">
            <div class="field" style="flex: 2;">
                <div class="field-label">Endereço</div>
                <div class="field-value">{{.PrestadorEndereco}}</div>
            </div>
            <div class="field">
                <div class="field-label">IM</div>
                <div class="field-value">{{.PrestadorIM}}</div>
            </div>
        </div>
    </div>

    <!-- Tomador -->
    <div class="section">
        <div class="section-title">Tomador de Serviços</div>
        <div class="row">
            <div class="field" style="flex: 2;">
                <div class="field-label">Nome/Razão Social</div>
                <div class="field-value">{{.TomadorNome}}</div>
            </div>
            <div class="field">
                <div class="field-label">CPF/CNPJ</div>
                <div class="field-value">{{.TomadorDocumento}}</div>
            </div>
        </div>
        <div class="row">
            <div class="field">
                <div class="field-label">Endereço</div>
                <div class="field-value">{{.TomadorEndereco}}</div>
            </div>
        </div>
    </div>

    <!-- Discriminação -->
    <div class="section">
        <div class="section-title">Discriminação dos Serviços</div>
        <div class="discriminacao">{{.Discriminacao}}</div>
        <div class="row" style="margin-top: 10px;">
            <div class="field">
                <div class="field-label">Código do Serviço</div>
                <div class="field-value">{{.CodigoServico}}</div>
            </div>
            <div class="field">
                <div class="field-label">CNAE</div>
                <div class="field-value">{{.CNAE}}</div>
            </div>
            <div class="field">
                <div class="field-label">Data Competência</div>
                <div class="field-value">{{.DataCompetencia}}</div>
            </div>
        </div>
    </div>

    <!-- Valores -->
    <div class="section">
        <div class="section-title">Valores</div>
        <table class="valores-table">
            <tr>
                <td class="label">Valor dos Serviços</td>
                <td class="value">{{.ValorServicos}}</td>
            </tr>
            <tr>
                <td class="label">(-) Deduções</td>
                <td class="value">{{.ValorDeducoes}}</td>
            </tr>
            <tr>
                <td class="label">Base de Cálculo</td>
                <td class="value">{{.ValorLiquido}}</td>
            </tr>
            <tr>
                <td class="label">Alíquota ISS</td>
                <td class="value">{{.AliquotaISS}}</td>
            </tr>
            <tr>
                <td class="label">Valor do ISS {{if .ISSRetido}}(RETIDO){{end}}</td>
                <td class="value">{{.ValorISS}}</td>
            </tr>
            {{if .ValorPIS}}
            <tr>
                <td class="label">PIS Retido</td>
                <td class="value">{{.ValorPIS}}</td>
            </tr>
            {{end}}
            {{if .ValorCOFINS}}
            <tr>
                <td class="label">COFINS Retido</td>
                <td class="value">{{.ValorCOFINS}}</td>
            </tr>
            {{end}}
            {{if .ValorIR}}
            <tr>
                <td class="label">IR Retido</td>
                <td class="value">{{.ValorIR}}</td>
            </tr>
            {{end}}
            {{if .ValorCSLL}}
            <tr>
                <td class="label">CSLL Retido</td>
                <td class="value">{{.ValorCSLL}}</td>
            </tr>
            {{end}}
            {{if .ValorINSS}}
            <tr>
                <td class="label">INSS Retido</td>
                <td class="value">{{.ValorINSS}}</td>
            </tr>
            {{end}}
            <tr class="total-row">
                <td class="label">VALOR LÍQUIDO DA NOTA</td>
                <td class="value">{{.ValorLiquido}}</td>
            </tr>
        </table>
    </div>

    <!-- Verificação -->
    <div class="verification">
        <div style="margin-bottom: 5px; font-size: 10px;">Código de Verificação</div>
        <div class="verification-code">{{.CodigoVerificacao}}</div>
        <div style="margin-top: 8px; font-size: 9px;">
            Verifique a autenticidade em: <strong>{{.LinkVerificacao}}</strong>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Este documento é uma representação gráfica da NFS-e e foi gerado pelo sistema <strong>INOVAR</strong></p>
        <p>NFS-e emitida através do Portal Nacional da NFS-e (GOV.BR) • Ambiente: {{.Ambiente}}</p>
    </div>
</body>
</html>`

// GetDANFSeAsBase64 returns the DANFS-e HTML encoded as Base64
func (s *DANFSeService) GetDANFSeAsBase64(nfse *models.NotaFiscal, prestador *models.Prestador, tomador *models.Cliente) (string, error) {
	html, err := s.Generate(nfse, prestador, tomador)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString([]byte(html)), nil
}
