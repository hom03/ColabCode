package storage

import (
	"context"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

type RedisStore struct {
	client *redis.Client
}

func NewRedisStore() *RedisStore {
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	return &RedisStore{client: rdb}
}

func (r *RedisStore) Save(key string, data []byte) error {
	return r.client.Set(ctx, key, data, 0).Err()
}

func (r *RedisStore) Load(key string) ([]byte, error) {
	return r.client.Get(ctx, key).Bytes()
}
