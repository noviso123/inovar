package main

import (
	"fmt"
	"net"
	"time"
)

func main() {
	// Root IPv6 address from nslookup
	addr := "[2600:1f1e:75b:4b0b:3118:d444:168e:e82c]:5432"
	fmt.Printf("🔍 Testing TCP connection to %s...\n", addr)

	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		fmt.Printf("❌ Failed to connect: %v\n", err)
	} else {
		fmt.Printf("🎉 TCP Connection Successful!\n")
		conn.Close()
	}
}
