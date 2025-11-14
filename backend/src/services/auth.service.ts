import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { addPushToken } from './users.service';
import { createTeam } from './teams.service';
import { auth as firebaseAuth } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  createDefaultTeam?: boolean;
  teamName?: string;
}

export interface LoginData {
  email: string;
  password: string;
  pushToken?: string;
  platform?: string;
  deviceId?: string;
}

export interface GoogleLoginData {
  idToken: string;
  pushToken?: string;
  platform?: string;
  deviceId?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    isOnline: boolean;
    teamMemberships?: Array<{
      id: string;
      role: string;
      team: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
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
  const { email, password, displayName, phoneNumber, createDefaultTeam = true, teamName } = data;

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

  // Optionally create default team for user
  let defaultTeam = null;
  if (createDefaultTeam) {
    try {
      const slug = `${displayName.toLowerCase().replace(/\s+/g, '-')}-${user.id.substring(0, 8)}`;
      const name = teamName || `${displayName}'s Team`;
      defaultTeam = await createTeam(name, slug, user.id);
    } catch (error) {
      console.error('Error creating default team:', error);
      // Don't fail registration if team creation fails
    }
  }

  // Fetch user with team memberships
  const userWithTeams = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      isOnline: true,
      teamMemberships: {
        select: {
          id: true,
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    user: {
      id: userWithTeams!.id,
      email: userWithTeams!.email,
      displayName: userWithTeams!.displayName,
      avatarUrl: userWithTeams!.avatarUrl || undefined,
      isOnline: true,
      teamMemberships: userWithTeams!.teamMemberships,
    },
    tokens
  };
};

/**
 * Login user
 */
export const loginUser = async (data: LoginData): Promise<AuthResult> => {
  const { email, password, pushToken, platform, deviceId } = data;

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

  // Add push token if provided
  if (pushToken && platform) {
    try {
      await addPushToken(user.id, {
        pushToken,
        platform,
        deviceId
      });
      console.log('Push token added during login for user:', user.id);
    } catch (error) {
      console.error('Failed to add push token during login:', error);
      // Don't fail login if push token addition fails
    }
  }

  // Fetch user with team memberships
  const userWithTeams = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      isOnline: true,
      teamMemberships: {
        select: {
          id: true,
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    user: {
      id: userWithTeams!.id,
      email: userWithTeams!.email,
      displayName: userWithTeams!.displayName,
      avatarUrl: userWithTeams!.avatarUrl || undefined,
      isOnline: true,
      teamMemberships: userWithTeams!.teamMemberships,
    },
    tokens
  };
};

/**
 * Login with Google
 */
export const loginWithGoogle = async (data: GoogleLoginData): Promise<AuthResult> => {
  const { idToken, pushToken, platform, deviceId } = data;

  try {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    // Extract user information from the token
    const { email, name, picture } = decodedToken;

    if (!email) {
      throw new Error('Email not provided by Google');
    }

    // Find existing user by email
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
      }
    });

    // If user doesn't exist, create a new one
    if (!user) {
      // Generate a placeholder password (random UUID hashed)
      const placeholderPassword = await bcrypt.hash(uuidv4(), 12);

      // Extract display name from Google profile or use email prefix
      const displayName = name || email.split('@')[0];

      user = await prisma.user.create({
        data: {
          email,
          displayName,
          avatarUrl: picture,
          password: placeholderPassword,
          isOnline: true,
          lastSeen: new Date()
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          isOnline: true,
        }
      });

      // Create default team for the new user
      try {
        const slug = `${displayName.toLowerCase().replace(/\s+/g, '-')}-${user.id.substring(0, 8)}`;
        const teamName = `${displayName}'s Team`;
        await createTeam(teamName, slug, user.id);
      } catch (error) {
        console.error('Error creating default team for Google user:', error);
        // Don't fail login if team creation fails
      }
    } else {
      // Update online status for existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date()
        }
      });
    }

    // Add push token if provided
    if (pushToken && platform) {
      try {
        await addPushToken(user.id, {
          pushToken,
          platform,
          deviceId
        });
        console.log('Push token added during Google login for user:', user.id);
      } catch (error) {
        console.error('Failed to add push token during Google login:', error);
        // Don't fail login if push token addition fails
      }
    }

    // Fetch user with team memberships
    const userWithTeams = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        teamMemberships: {
          select: {
            id: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Generate JWT tokens
    const tokens = generateTokenPair(user.id, user.email);

    return {
      user: {
        id: userWithTeams!.id,
        email: userWithTeams!.email,
        displayName: userWithTeams!.displayName,
        avatarUrl: userWithTeams!.avatarUrl || undefined,
        isOnline: true,
        teamMemberships: userWithTeams!.teamMemberships,
      },
      tokens
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Google authentication failed: ${error.message}`);
    }
    throw new Error('Google authentication failed');
  }
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
