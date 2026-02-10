package services

import (
	"crypto/tls"
	"fmt"
	"os"

	"github.com/inovar/backend/internal/config"
	"gopkg.in/gomail.v2"
)

type EmailService struct {
	dialer *gomail.Dialer
	from   string
}

func NewEmailService(cfg *config.Config) *EmailService {
	host := cfg.SMTPHost
	port := cfg.SMTPPort
	user := cfg.SMTPUser
	pass := cfg.SMTPPassword

	// Fallback to env if config is empty (though config loads from env)
	if host == "" {
		host = "smtp.gmail.com"
	}
	if port == 0 {
		port = 587
	}

	d := gomail.NewDialer(host, port, user, pass)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	return &EmailService{
		dialer: d,
		from:   user,
	}
}

func (s *EmailService) SendWelcomeEmail(toEmail, userName, password string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Bem-vindo ao Inovar Gestão! 🚀")
	m.SetBody("text/html", fmt.Sprintf(`
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
	`, userName, toEmail, password, os.Getenv("FRONTEND_URL")))

	return s.dialer.DialAndSend(m)
}

func (s *EmailService) SendOSCreated(toEmail, clientName, osNumber, description string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", fmt.Sprintf("Nova OS #%s Aberta - Inovar", osNumber))
	m.SetBody("text/html", fmt.Sprintf(`
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
	`, clientName, osNumber, description))

	return s.dialer.DialAndSend(m)
}

func (s *EmailService) SendPasswordResetEmail(toEmail, token, userName string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", os.Getenv("FRONTEND_URL"), token)

	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Recuperação de Senha - Inovar Recupeção")
	m.SetBody("text/html", fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
			<h2 style="color: #dc2626;">Redefinição de Senha</h2>
			<p>Olá <b>%s</b>,</p>
			<p>Para criar uma nova senha, clique no botão abaixo:</p>
			<br>
			<a href="%s" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Minha Senha</a>
			<br><br>
			<p style="font-size: 12px; color: #666;">Se não foi você, apenas ignore este e-mail.</p>
		</div>
	`, userName, resetLink))

	return s.dialer.DialAndSend(m)
}

func (s *EmailService) SendOSFinalized(toEmail, clientName, osNumber, pdfLink string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", fmt.Sprintf("OS #%s Finalizada - Inovar Gestão", osNumber))
	m.SetBody("text/html", fmt.Sprintf(`
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
	`, clientName, osNumber, pdfLink))

	return s.dialer.DialAndSend(m)
}
