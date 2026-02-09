class AuthService {
  constructor() {
    // Simulated user database (can map to User DB in UML)
    this.users = {
      admin: {
        password: "admin123",
        role: "ADMIN",
        attempts: 0,
        locked: false
      },
      analyst: {
        password: "analyst123",
        role: "ANALYST",
        attempts: 0,
        locked: false
      }
    };

    this.MAX_ATTEMPTS = 3;
  }

  authenticate(username, password) {
    console.log("Authenticating user:", username);

    const user = this.users[username];

    if (!user) {
      return {
        success: false,
        message: "User does not exist"
      };
    }

    if (user.locked) {
      return {
        success: false,
        message: "Account locked due to multiple failed attempts"
      };
    }

    if (user.password === password) {
      user.attempts = 0;

      return {
        success: true,
        role: user.role,
        message: "Login successful"
      };
    }

    user.attempts++;

    if (user.attempts >= this.MAX_ATTEMPTS) {
      user.locked = true;
    }

    return {
      success: false,
      message: "Invalid credentials",
      attemptsLeft: this.MAX_ATTEMPTS - user.attempts
    };
  }

  authorize(role, requiredRole) {
    return role === requiredRole;
  }
}

module.exports = AuthService;