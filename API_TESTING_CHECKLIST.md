# 🧪 API Testing Checklist - Auth & Users Routes

## 📍 Setup
- [ ] Open browser to: `http://localhost:8000/docs`
- [ ] Server is running on port 8000

---

## 🔐 Step 1: Auth Routes (`/api/auth`)

### 1.1 Register New User
- [ ] Find **POST `/api/auth/register`**
- [ ] Click "Try it out"
- [ ] Enter test data:
```json
{
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User",
  "password": "testpass123"
}
```
- [ ] Click "Execute"
- [ ] ✅ Verify: `201 Created` - "User registered successfully"

### 1.2 Login to Get JWT Token
- [ ] Find **POST `/api/auth/token`**
- [ ] Click "Try it out"
- [ ] Enter credentials:
  - **username**: `test@example.com`
  - **password**: `testpass123`
- [ ] Click "Execute"
- [ ] ✅ Verify: `200 OK` with JWT token
- [ ] 📋 **COPY THE ACCESS TOKEN** (you'll need it!)

### 1.3 Authorize for Protected Routes
- [ ] Click **"Authorize"** button (top right)
- [ ] Paste token in "Value" field
- [ ] Click "Authorize" then "Close"
- [ ] 🔓 You can now access protected endpoints

---

## 👤 Step 2: Users Routes (`/api/users`) 🔒 Protected

### 2.1 Get Current User Profile
- [ ] Find **GET `/api/users/me`**
- [ ] Click "Try it out" → "Execute"
- [ ] ✅ Verify: `200 OK` with user data:
```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User",
  "created_at": "...",
  "updated_at": "..."
}
```

### 2.2 Update User Profile
- [ ] Find **PUT `/api/users/me`**
- [ ] Click "Try it out"
- [ ] Enter update data:
```json
{
  "first_name": "Updated",
  "last_name": "Name"
}
```
- [ ] Click "Execute"
- [ ] ✅ Verify: `200 OK` with updated user data

### 2.3 Change Password (Success Case)
- [ ] Find **PUT `/api/users/me/password`**
- [ ] Click "Try it out"
- [ ] Enter password data:
```json
{
  "current_password": "testpass123",
  "new_password": "newpass456",
  "new_password_confirm": "newpass456"
}
```
- [ ] Click "Execute"
- [ ] ✅ Verify: `204 No Content` (success)

### 2.4 Test Password Mismatch (Error Case)
- [ ] Find **PUT `/api/users/me/password`**
- [ ] Click "Try it out"
- [ ] Enter mismatched passwords:
```json
{
  "current_password": "newpass456",
  "new_password": "anotherpass",
  "new_password_confirm": "differentpass"
}
```
- [ ] Click "Execute"
- [ ] ✅ Verify: `401 Unauthorized` - "New passwords do not match"

### 2.5 Delete Account ⚠️ (Optional - Destructive!)
- [ ] Find **DELETE `/api/users/me`**
- [ ] Click "Try it out" → "Execute"
- [ ] ✅ Verify: `204 No Content`
- [ ] ⚠️ **WARNING**: Permanently deletes user and all data!

---

## 🚨 Step 3: Error Handling Tests

### 3.1 Test Duplicate Registration
- [ ] Try **POST `/api/auth/register`** with same email again
- [ ] ✅ Verify: `400 Bad Request` - "User with this email already exists"

### 3.2 Test Invalid Login
- [ ] Try **POST `/api/auth/token`** with wrong password
- [ ] ✅ Verify: `401 Unauthorized` - "Incorrect email or password"

### 3.3 Test Protected Route Without Token
- [ ] Click "Authorize" → "Logout"
- [ ] Try **GET `/api/users/me`**
- [ ] ✅ Verify: `401 Unauthorized` - "Not authenticated"

---

## 📝 Quick Summary Checklist

- [ ] ✅ Register new user
- [ ] ✅ Login and get JWT token
- [ ] ✅ Authorize with token
- [ ] ✅ Get user profile
- [ ] ✅ Update user profile
- [ ] ✅ Change password (matching confirmation)
- [ ] ✅ Test password mismatch error
- [ ] ✅ Test duplicate email error
- [ ] ✅ Test invalid login
- [ ] ✅ Test protected route without token

---

## 💻 Alternative: cURL Commands

### Register
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","first_name":"Test","last_name":"User","password":"testpass123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"
```

### Get Profile (replace TOKEN)
```bash
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎯 Testing Complete!
Once all checkboxes are marked, your auth and users endpoints are fully tested and working! 🚀
