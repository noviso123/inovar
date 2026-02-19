package services

import (
	"fmt"
	"inovar/internal/infra/bridge"
	"inovar/internal/infra/config"
)

type EmailService struct {
	from        string
	frontendURL string
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{
		from:        cfg.SMTPUser,
		frontendURL: cfg.FrontendURL,
	}
}

func (s *EmailService) send(to, subject, body string) error {
	_, err := bridge.CallPython("send_email", map[string]interface{}{
		"to":      to,
		"subject": subject,
		"body":    body,
	})
	return err
}

func (s *EmailService) SendWelcomeEmail(toEmail, userName, password string) error {
	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
			<h2 style="color: #2563eb;">Olá, %s!</h2>
			<p>Seu cadastro no sistema <b>Inovar Gestão</b> foi realizado com sucesso.</p>
			<p>Aqui estão suas credenciais de acesso:</p>
			<ul>
				<li><b>Usuário/Email:</b> %s</li>
				<li><b>Senha:</b> %s</li>
			</ul>
			<p>Recomendamos que você altere sua senha após o primeiro acesso.</p>
			<br>
			<a href="%s" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Sistema</a>
		</div>
	`, userName, toEmail, password, s.frontendURL)

	return s.send(toEmail, "Bem-vindo ao Inovar Gestão! 🚀", body)
}

func (s *EmailService) SendOSCreated(toEmail, clientName, osNumber, description string) error {
	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
			<h2 style="color: #059669;">Nova Ordem de Serviço Aberta</h2>
			<p>Olá <b>%s</b>,</p>
			<p>Uma nova solicitação foi registrada para você.</p>
			<ul>
				<li><b>Número:</b> #%s</li>
				<li><b>Descrição:</b> %s</li>
			</ul>
			<p>Você será notificado a cada atualização.</p>
		</div>
	`, clientName, osNumber, description)

	return s.send(toEmail, fmt.Sprintf("Nova OS #%s Aberta - Inovar", osNumber), body)
}

func (s *EmailService) SendPasswordResetEmail(toEmail, token, userName string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.frontendURL, token)

	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
			<h2 style="color: #dc2626;">Redefinição de Senha</h2>
			<p>Olá <b>%s</b>,</p>
			<p>Para criar uma nova senha, clique no botão abaixo:</p>
			<br>
			<a href="%s" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Minha Senha</a>
			<br><br>
			<p style="font-size: 12px; color: #666;">Se não foi você, apenas ignore este e-mail.</p>
		</div>
	`, userName, resetLink)

	return s.send(toEmail, "Recuperação de Senha - Inovar Recupeção", body)
}

func (s *EmailService) SendOSFinalized(toEmail, clientName, osNumber, pdfLink string) error {
	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
			<h2 style="color: #2563eb;">Serviço Concluído! ✅</h2>
			<p>Olá <b>%s</b>,</p>
			<p>A Ordem de Serviço <b>#%s</b> foi finalizada com sucesso.</p>
			<p>Você pode visualizar o relatório completo clicando no botão abaixo:</p>
			<br>
			<a href="%s" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Relatório Completo</a>
			<br><br>
			<p>Obrigado por confiar na <b>Inovar Gestão</b>!</p>
		</div>
	`, clientName, osNumber, pdfLink)

	return s.send(toEmail, fmt.Sprintf("OS #%s Finalizada - Inovar Gestão", osNumber), body)
}
