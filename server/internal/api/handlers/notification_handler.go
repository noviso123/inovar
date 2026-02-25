package handlers

import (
	"inovar/internal/api/middleware"

	"github.com/gofiber/fiber/v2"
)

// ListNotifications returns all notifications for the current user
func (h *Handler) ListNotifications(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	notifications, err := h.NotificationService.GetUserNotifications(userID)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, notifications)
}

// MarkNotificationAsRead marks a specific notification as read
func (h *Handler) MarkNotificationAsRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	notificationID := c.Params("id")

	if err := h.NotificationService.MarkAsRead(notificationID, userID); err != nil {
		return ServerError(c, err)
	}

	return Success(c, fiber.Map{"message": "Notificação marcada como lida"})
}

// MarkAllNotificationsAsRead marks all notifications as read
func (h *Handler) MarkAllNotificationsAsRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	if err := h.NotificationService.MarkAllAsRead(userID); err != nil {
		return ServerError(c, err)
	}

	return Success(c, fiber.Map{"message": "Todas as notificações marcadas como lidas"})
}
