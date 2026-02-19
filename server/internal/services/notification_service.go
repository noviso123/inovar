package services

import (
	"inovar/internal/domain"
	"inovar/internal/websocket"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationService struct {
	db  *gorm.DB
	hub *websocket.Hub
}

func NewNotificationService(db *gorm.DB, hub *websocket.Hub) *NotificationService {
	return &NotificationService{db: db, hub: hub}
}

// CreateNotification creates a new notification for a user
func (s *NotificationService) CreateNotification(userID, title, message, notifType, link string) (*domain.Notification, error) {
	notification := &domain.Notification{
		ID:        uuid.New().String(),
		UserID:    userID,
		Title:     title,
		Message:   message,
		Type:      notifType,
		Link:      link,
		Read:      false,
		CreatedAt: time.Now(),
	}

	if err := s.db.Create(notification).Error; err != nil {
		return nil, err
	}

	// Broadcast notification to user
	s.hub.Broadcast("notification:new", notification)

	return notification, nil
}

// GetUserNotifications returns all notifications for a user, ordered by date
func (s *NotificationService) GetUserNotifications(userID string) ([]domain.Notification, error) {
	var notifications []domain.Notification
	if err := s.db.Where("user_id = ?", userID).Order("created_at desc").Find(&notifications).Error; err != nil {
		return nil, err
	}
	return notifications, nil
}

// ComputeUnreadCount returns the number of unread notifications
func (s *NotificationService) ComputeUnreadCount(userID string) (int64, error) {
	var count int64
	if err := s.db.Model(&domain.Notification{}).Where("user_id = ? AND read = ?", userID, false).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// MarkAsRead marks a single notification as read
func (s *NotificationService) MarkAsRead(id, userID string) error {
	return s.db.Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("read", true).Error
}

// MarkAllAsRead marks all notifications for a user as read
func (s *NotificationService) MarkAllAsRead(userID string) error {
	return s.db.Model(&domain.Notification{}).
		Where("user_id = ? AND read = ?", userID, false).
		Update("read", true).Error
}
