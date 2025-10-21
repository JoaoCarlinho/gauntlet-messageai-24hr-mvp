import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    isOnline: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
}

/**
 * Register a new user
 */
export const registerUser = async (data: RegisterData): Promise<AuthResult> => {
  const { email, password, displayName, phoneNumber } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phoneNumber ? [{ phoneNumber }] : [])
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('User with this email already exists');
    }
    if (existingUser.phoneNumber === phoneNumber) {
      throw new Error('User with this phone number already exists');
    }
  }

  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      displayName,
      phoneNumber,
      isOnline: true,
      lastSeen: new Date()
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      isOnline: true
    }
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || undefined,
      isOnline: true
    },
    tokens
  };
};

/**
 * Login user
 */
export const loginUser = async (data: LoginData): Promise<AuthResult> => {
  const { email, password } = data;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Update user online status and last seen
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isOnline: true,
      lastSeen: new Date()
    }
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || undefined,
      isOnline: true
    },
    tokens
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshResult> => {
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const { accessToken, expiresIn } = generateTokenPair(user.id, user.email, payload.tokenVersion);

    return {
      accessToken,
      expiresIn
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Logout user
 */
export const logoutUser = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: false,
      lastSeen: new Date()
    }
  });
};

/**
 * Change user password
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  // Get user with current password
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Validate new password
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedNewPassword,
      updatedAt: new Date()
    }
  });
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      phoneNumber: true,
      isOnline: true,
      lastSeen: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    displayName?: string;
    avatarUrl?: string;
    phoneNumber?: string;
  }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...updates,
      updatedAt: new Date()
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      phoneNumber: true,
      isOnline: true,
      lastSeen: true,
      updatedAt: true
    }
  });

  return user;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (basic validation)
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phoneNumber);
};
