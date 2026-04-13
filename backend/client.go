package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"colabcode/proto"

	"google.golang.org/grpc"
)

func main() {
	conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	client := proto.NewCRDTServiceClient(conn)

	// ---- open receive stream
	stream, err := client.Sync(context.Background(), &proto.Empty{})
	if err != nil {
		log.Fatal(err)
	}

	// ---- listen for updates
	go func() {
		for {
			op, err := stream.Recv()
			if err != nil {
				log.Println("Stream ended:", err)
				return
			}
			fmt.Printf("Received: %s %s\n", op.Type, op.Value)
		}
	}()

	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("Enter operation (add/remove value): ")
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		parts := strings.SplitN(input, " ", 2)
		if len(parts) != 2 {
			fmt.Println("Invalid format")
			continue
		}

		// ---- send via unary RPC
		_, err := client.SendOperation(context.Background(), &proto.Operation{
			Type:  parts[0],
			Value: parts[1],
		})

		if err != nil {
			log.Println("Send failed:", err)
		}
	}
}
