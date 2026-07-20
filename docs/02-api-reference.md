# API Reference

The MSRPEngine exposes a RESTful web API for headless communication, ideal for frontend web apps. When `SYSTEM_NO_INTERFACE=true` is set, the terminal Readline is disabled, and the app serves HTTP endpoints instead.

## Authentication
By default, the server uses basic JWT authentication.
Set these environment variables before running:
- `WEB_USER`: The admin username (e.g., `admin`).
- `WEB_PASS`: The admin password (e.g., `password`).
- `JWT_SECRET`: A secure random string used to sign tokens.

### Login
`POST /login`
Returns a Bearer token valid for standard requests.

**Request Body**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response (200 OK)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

## Chat and Polling

### Send Message / Poll
`POST /sendMessage`

This endpoint serves a dual purpose. It allows the frontend to send a message to the bot, or if `message` is empty, it simply acts as a "long poll" to fetch any unread messages from the system (like proactive texts or system state updates).

**Headers**
- `Authorization`: `Bearer <token>`

**Query Parameters**
- `last_id`: (Optional) Provide the UUID of the last message your frontend successfully received. The server will only return messages that have an ID *after* this one, ensuring no duplicates.

**Request Body**
```json
{
  "message": "Hello Lyra! How are you feeling?"
}
```
*Note: Send an empty string `""` to poll without sending a message.*

**Response (200 OK)**
```json
{
  "messages": [
    {
      "id": "abc-123",
      "author": "user",
      "content": "Hello Lyra! How are you feeling?",
      "mind_state": "0.10:0.70:0.10:0.10:0.10",
      "timestamp": "2026-07-20T09:28:46Z"
    },
    {
      "id": "def-456",
      "author": "lyra",
      "content": "I'm feeling strangely analytical today. Why do you ask?",
      "mind_state": "0.20:0.80:0.15:0.10:0.05",
      "timestamp": "2026-07-20T09:28:49Z"
    }
  ]
}
```

## System Mindstate Retrieval
`GET /mindstate`

Returns the current biological and active state of the bot in real-time. This endpoint does *not* reset the Idle timer or interfere with the sleep rule engine.

**Response (200 OK)**
```json
{
  "mind_state": "0.20:0.80:0.15:0.10:0.05",
  "ma": 0.20,
  "ua": 0.80,
  "se": 0.15,
  "ox": 0.10,
  "co": 0.05
}
```
