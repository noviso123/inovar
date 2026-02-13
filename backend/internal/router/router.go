package router

import (
	"net/http"
	"strings"
)

type Route struct {
	Method  string
	Path    string
	Handler http.HandlerFunc
}

type Router struct {
	routes      []Route
	middlewares []func(http.HandlerFunc) http.HandlerFunc
}

func New() *Router {
	return &Router{
		routes:      []Route{},
		middlewares: []func(http.HandlerFunc) http.HandlerFunc{},
	}
}

// Use adds middleware
func (r *Router) Use(mw func(http.HandlerFunc) http.HandlerFunc) {
	r.middlewares = append(r.middlewares, mw)
}

// GET registers a GET route
func (r *Router) GET(path string, handler http.HandlerFunc) {
	r.routes = append(r.routes, Route{"GET", path, handler})
}

// POST registers a POST route
func (r *Router) POST(path string, handler http.HandlerFunc) {
	r.routes = append(r.routes, Route{"POST", path, handler})
}

// PUT registers a PUT route
func (r *Router) PUT(path string, handler http.HandlerFunc) {
	r.routes = append(r.routes, Route{"PUT", path, handler})
}

// DELETE registers a DELETE route
func (r *Router) DELETE(path string, handler http.HandlerFunc) {
	r.routes = append(r.routes, Route{"DELETE", path, handler})
}

// ServeHTTP implements http.Handler
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Apply middlewares
	handler := r.findHandler(req.Method, req.URL.Path)
	if handler == nil {
		http.NotFound(w, req)
		return
	}

	// Chain middlewares in reverse order
	for i := len(r.middlewares) - 1; i >= 0; i-- {
		handler = r.middlewares[i](handler)
	}

	handler(w, req)
}

// findHandler finds a matching handler
func (r *Router) findHandler(method, path string) http.HandlerFunc {
	for _, route := range r.routes {
		if route.Method == method && r.matchPath(route.Path, path) {
			return route.Handler
		}
	}
	return nil
}

// matchPath checks if a path matches (simple match, no params for now)
func (r *Router) matchPath(pattern, path string) bool {
	// Simple exact match for now
	// TODO: Add support for path parameters like /users/:id
	return pattern == path || strings.HasPrefix(path, pattern)
}
