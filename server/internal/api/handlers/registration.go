package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/domain"
)

// PublicRegisterRequest represents the combined payload for quick registration
type PublicRegisterRequest struct {
	// Client Data
	Name     string                 `json:"name"`
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	Phone    string                 `json:"phone"`
	Document string                 `json:"document"`
	Endereco *CreateEnderecoRequest `json:"endereco,omitempty"`

	// Equipment Data
	EquipBrand string `json:"equipBrand"`
	EquipModel string `json:"equipModel"`
	EquipBTU   int    `json:"equipBTU"`
}

// PublicRegister handles self-registration for new clients
func (h *Handler) PublicRegister(c *fiber.Ctx) error {
	var req PublicRegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// 1. Basic Validation
	if req.Email == "" || req.Password == "" || req.Name == "" {
		return BadRequest(c, "Nome, e-mail e senha são obrigatórios")
	}

	// 2. Check if email already exists
	var count int64
	h.DB.Model(&domain.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return BadRequest(c, "E-mail já cadastrado no sistema")
	}

	// 3. Get Default Company ID (The primary provider)
	var company struct {
		ID string
	}
	if err := h.DB.Table("prestadores").Select("id").First(&company).Error; err != nil {
		return ServerError(c, err) // System needs at least one provider
	}
	companyID := company.ID

	// 4. Start Transaction
	tx := h.DB.Begin()

	// 5. Create User
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	user := domain.User{
		ID:                 uuid.New().String(),
		Name:               req.Name,
		Email:              req.Email,
		PasswordHash:       string(hashedPassword),
		Role:               domain.RoleCliente,
		Phone:              req.Phone,
		Active:             true,
		MustChangePassword: false, // User set their own password
		CompanyID:          &companyID,
		CreatedAt:          time.Now(),
	}
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 6. Create Address if provided
	var enderecoID *string
	if req.Endereco != nil {
		endereco := domain.Endereco{
			ID:         uuid.New().String(),
			Street:     req.Endereco.Street,
			Number:     req.Endereco.Number,
			Complement: req.Endereco.Complement,
			District:   req.Endereco.District,
			City:       req.Endereco.City,
			State:      req.Endereco.State,
			ZipCode:    req.Endereco.ZipCode,
		}
		if err := tx.Create(&endereco).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}
		enderecoID = &endereco.ID
	}

	// 7. Create Client Profile
	cliente := domain.Cliente{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		Name:       req.Name,
		Document:   req.Document,
		Email:      req.Email,
		Phone:      req.Phone,
		EnderecoID: enderecoID,
		CompanyID:  companyID,
		CreatedAt:  time.Now(),
	}
	if err := tx.Create(&cliente).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 8. Create Initial Equipment if provided
	if req.EquipBrand != "" || req.EquipModel != "" {
		equipment := domain.Equipamento{
			ID:        uuid.New().String(),
			ClientID:  cliente.ID,
			CompanyID: companyID,
			Brand:     req.EquipBrand,
			Model:     req.EquipModel,
			BTU:       req.EquipBTU,
			Active:    true,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&equipment).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}
	}

	// 9. Commit Transaction
	if err := tx.Commit().Error; err != nil {
		return ServerError(c, err)
	}

	// 10. Broadcast events (optional but good for UI updates if admin is watching)
	h.Hub.Broadcast("client:created", cliente)

	// 11. Send Welcome Email
	go func() {
		if h.EmailService != nil {
			h.EmailService.SendWelcomeEmail(user.Email, user.Name, req.Password)
		}
	}()

	return Created(c, fiber.Map{
		"message": "Cadastro realizado com sucesso! Você já pode entrar no sistema.",
		"user":    user,
	})
}
