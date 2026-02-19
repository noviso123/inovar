package domain

// Endereco represents an address
type Endereco struct {
	ID         string `gorm:"primaryKey;size:36" json:"id"`
	Street     string `gorm:"size:255;not null" json:"street"`
	Number     string `gorm:"size:20" json:"number"`
	Complement string `gorm:"size:100" json:"complement,omitempty"`
	District   string `gorm:"size:100" json:"district"`
	City       string `gorm:"size:100;not null" json:"city"`
	State      string `gorm:"size:2;not null" json:"state"`
	ZipCode    string `gorm:"size:10;not null" json:"zipCode"`
}

func (Endereco) TableName() string { return "enderecos" }
