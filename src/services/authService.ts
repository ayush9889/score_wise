import { User, Group, GroupMember, Invitation } from '../types/auth';
import { storageService } from './storage';

class AuthService {
  private currentUser: User | null = null;
  private currentGroups: Group[] = [];
  private otpStore: { [phone: string]: { otp: string, expires: number, attempts: number } } = {}; // Enhanced OTP store

  // Phone Authentication Methods
  async signUpWithPhone(phone: string, name: string): Promise<User> {
    // Check if user already exists
    const existingUser = await storageService.getUserByPhone(phone);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    // Create new user (unverified initially)
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: '', // No email for phone signup
      name,
      phone,
      isVerified: false, // Will be verified after OTP
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      groupIds: []
    };

    await storageService.saveUser(user);
    console.log('📱 User created with phone:', phone);
    return user;
  }

  async signInWithPhone(phone: string): Promise<User> {
    const user = await storageService.getUserByPhone(phone);
    if (!user) {
      throw new Error('No account found with this phone number');
    }

    // Update last login
    user.lastLoginAt = Date.now();
    await storageService.saveUser(user);
    
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Load user's groups
    await this.loadUserGroups();
    
    console.log('📱 User signed in with phone:', phone);
    return user;
  }

  async checkUserByPhone(phone: string): Promise<boolean> {
    const user = await storageService.getUserByPhone(phone);
    return !!user;
  }

  // Enhanced OTP Methods
  async sendOTP(phone: string): Promise<void> {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + (5 * 60 * 1000); // 5 minutes expiry
    
    // Store OTP with expiry and attempt tracking
    this.otpStore[phone] = {
      otp,
      expires,
      attempts: 0
    };
    
    // In a real app, send the OTP via SMS here
    console.log(`📱 OTP for ${phone}: ${otp} (expires in 5 minutes)`);
    
    // For demo purposes, show OTP in console and alert
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Demo OTP for ${phone}: ${otp}`);
      // Optional: Show in UI for demo
      setTimeout(() => {
        alert(`Demo OTP for ${phone}: ${otp}\n\nThis is for demo purposes only. In production, this would be sent via SMS.`);
      }, 500);
    }
  }

  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const storedOtpData = this.otpStore[phone];
    
    if (!storedOtpData) {
      throw new Error('No OTP found for this phone number. Please request a new one.');
    }

    // Check if OTP has expired
    if (Date.now() > storedOtpData.expires) {
      delete this.otpStore[phone];
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Check attempt limit
    if (storedOtpData.attempts >= 3) {
      delete this.otpStore[phone];
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (storedOtpData.otp === otp) {
      // OTP is correct - mark user as verified
      const user = await storageService.getUserByPhone(phone);
      if (user) {
        user.isVerified = true;
        user.lastLoginAt = Date.now();
        await storageService.saveUser(user);
        
        // Update current user if it's the same
        if (this.currentUser && this.currentUser.phone === phone) {
          this.currentUser.isVerified = true;
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
      }
      
      // Clean up OTP
      delete this.otpStore[phone];
      
      console.log('✅ OTP verified successfully for:', phone);
      return true;
    } else {
      // Increment attempt count
      storedOtpData.attempts++;
      console.log(`❌ Invalid OTP for ${phone}. Attempts: ${storedOtpData.attempts}/3`);
      return false;
    }
  }

  async resendOTP(phone: string): Promise<void> {
    // Clear existing OTP and send new one
    delete this.otpStore[phone];
    await this.sendOTP(phone);
  }

  // Original Email Authentication Methods (unchanged)
  async signUp(email: string, password: string, name: string, phone?: string): Promise<User> {
    // Check if user already exists
    const existingUser = await storageService.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      phone,
      isVerified: true, // Email users are verified by default (in real app, would need email verification)
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      groupIds: []
    };

    await storageService.saveUser(user);
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const user = await storageService.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    user.lastLoginAt = Date.now();
    await storageService.saveUser(user);
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Load user's groups
    await this.loadUserGroups();
    
    return user;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.currentGroups = [];
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentGroups');
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        this.loadUserGroups(); // Load groups when user is restored
      }
    }
    return this.currentUser;
  }

  // Group Management (unchanged)
  async createGroup(name: string, description?: string): Promise<Group> {
    if (!this.currentUser) {
      throw new Error('Must be logged in to create a group');
    }

    const group: Group = {
      id: `group_${Date.now()}`,
      name,
      description,
      createdBy: this.currentUser.id,
      createdAt: Date.now(),
      members: [{
        userId: this.currentUser.id,
        role: 'admin',
        joinedAt: Date.now(),
        isActive: true,
        permissions: {
          canCreateMatches: true,
          canScoreMatches: true,
          canManageMembers: true,
          canViewStats: true
        }
      }],
      isPublic: false,
      inviteCode: this.generateInviteCode(),
      settings: {
        allowPublicJoin: false,
        requireApproval: true,
        allowGuestScoring: false,
        defaultMatchFormat: 'T20'
      }
    };

    await storageService.saveGroup(group);
    
    // Add group to user's group list
    if (!this.currentUser.groupIds) {
      this.currentUser.groupIds = [];
    }
    this.currentUser.groupIds.push(group.id);
    await storageService.saveUser(this.currentUser);
    
    this.currentGroups.push(group);
    this.saveGroupsToStorage();
    
    return group;
  }

  async joinGroup(inviteCode: string): Promise<Group> {
    if (!this.currentUser) {
      throw new Error('Must be logged in to join a group');
    }

    const group = await storageService.getGroupByInviteCode(inviteCode);
    if (!group) {
      throw new Error('Invalid invite code');
    }

    // Check if user is already a member
    const existingMember = group.members.find(m => m.userId === this.currentUser!.id);
    if (existingMember) {
      throw new Error('Already a member of this group');
    }

    // Add user as member
    group.members.push({
      userId: this.currentUser.id,
      role: 'member',
      joinedAt: Date.now(),
      isActive: true,
      permissions: {
        canCreateMatches: true,
        canScoreMatches: true,
        canManageMembers: false,
        canViewStats: true
      }
    });

    await storageService.saveGroup(group);
    
    // Add group to user's group list
    if (!this.currentUser.groupIds) {
      this.currentUser.groupIds = [];
    }
    this.currentUser.groupIds.push(group.id);
    await storageService.saveUser(this.currentUser);
    
    this.currentGroups.push(group);
    this.saveGroupsToStorage();
    
    return group;
  }

  async inviteToGroup(groupId: string, email?: string, phone?: string): Promise<Invitation> {
    if (!this.currentUser) {
      throw new Error('Must be logged in to invite members');
    }

    const group = await storageService.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check permissions
    const member = group.members.find(m => m.userId === this.currentUser!.id);
    if (!member || !member.permissions.canManageMembers) {
      throw new Error('No permission to invite members');
    }

    const invitation: Invitation = {
      id: `invite_${Date.now()}`,
      groupId,
      invitedBy: this.currentUser.id,
      invitedEmail: email,
      invitedPhone: phone,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };

    await storageService.saveInvitation(invitation);

    // Send OTP if phone is provided
    if (phone) {
      await this.sendOTP(phone);
    }
    // In a real app, send email here if email is provided
    return invitation;
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const group = await storageService.getGroup(groupId);
    if (!group) return [];

    const members: User[] = [];
    for (const member of group.members) {
      const user = await storageService.getUser(member.userId);
      if (user) {
        members.push(user);
      }
    }
    return members;
  }

  // Multiple Groups Support
  async loadUserGroups(): Promise<void> {
    if (!this.currentUser || !this.currentUser.groupIds) {
      this.currentGroups = [];
      return;
    }

    const groups: Group[] = [];
    for (const groupId of this.currentUser.groupIds) {
      const group = await storageService.getGroup(groupId);
      if (group) {
        groups.push(group);
      }
    }
    
    this.currentGroups = groups;
    this.saveGroupsToStorage();
  }

  getUserGroups(): Group[] {
    if (this.currentGroups.length === 0) {
      const stored = localStorage.getItem('currentGroups');
      if (stored) {
        this.currentGroups = JSON.parse(stored);
      }
    }
    return this.currentGroups;
  }

  getCurrentGroup(): Group | null {
    const groups = this.getUserGroups();
    return groups.length > 0 ? groups[0] : null; // Return first group as default
  }

  setCurrentGroup(group: Group): void {
    // Move selected group to first position
    this.currentGroups = this.currentGroups.filter(g => g.id !== group.id);
    this.currentGroups.unshift(group);
    this.saveGroupsToStorage();
  }

  private saveGroupsToStorage(): void {
    localStorage.setItem('currentGroups', JSON.stringify(this.currentGroups));
  }

  // Guest Access
  generateGuestLink(groupId: string): string {
    const baseUrl = window.location.origin;
    const token = btoa(`${groupId}:${Date.now()}`);
    return `${baseUrl}/guest/${token}`;
  }

  async validateGuestAccess(token: string): Promise<Group | null> {
    try {
      const decoded = atob(token);
      const [groupId] = decoded.split(':');
      const group = await storageService.getGroup(groupId);
      
      if (group && group.settings.allowGuestScoring) {
        return group;
      }
      return null;
    } catch {
      return null;
    }
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Utility methods
  canUserScore(groupId: string): boolean {
    if (!this.currentUser) return false;
    
    const group = this.currentGroups.find(g => g.id === groupId);
    if (!group) return false;

    const member = group.members.find(m => m.userId === this.currentUser!.id);
    return member?.permissions.canScoreMatches || false;
  }

  canUserManageGroup(groupId: string): boolean {
    if (!this.currentUser) return false;
    
    const group = this.currentGroups.find(g => g.id === groupId);
    if (!group) return false;

    const member = group.members.find(m => m.userId === this.currentUser!.id);
    return member?.permissions.canManageMembers || false;
  }

  async removeUnverifiedMember(groupId: string, userId: string): Promise<void> {
    const group = await storageService.getGroup(groupId);
    if (!group) throw new Error('Group not found');
    
    const memberIndex = group.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) throw new Error('Member not found');
    
    const user = await storageService.getUser(userId);
    if (user && !user.isVerified) {
      group.members.splice(memberIndex, 1);
      await storageService.saveGroup(group);
      
      // Remove group from user's group list
      if (user.groupIds) {
        user.groupIds = user.groupIds.filter(gId => gId !== groupId);
        await storageService.saveUser(user);
      }
    } else {
      throw new Error('Cannot remove a verified member');
    }
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    return storageService.getUserByPhone(phone);
  }

  async addUser(user: User): Promise<void> {
    return storageService.saveUser(user);
  }

  async addUserToGroup(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
    const group = await storageService.getGroup(groupId);
    if (!group) throw new Error('Group not found');

    // Check if user is already a member
    const existingMember = group.members.find(m => m.userId === userId);
    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    // Add user to group
    group.members.push({
      userId,
      role,
      joinedAt: Date.now(),
      isActive: true,
      permissions: {
        canCreateMatches: true,
        canScoreMatches: true,
        canManageMembers: role === 'admin',
        canViewStats: true
      }
    });

    await storageService.saveGroup(group);

    // Add group to user's group list
    const user = await storageService.getUser(userId);
    if (user) {
      if (!user.groupIds) {
        user.groupIds = [];
      }
      if (!user.groupIds.includes(groupId)) {
        user.groupIds.push(groupId);
        await storageService.saveUser(user);
      }
    }
  }

  // Get OTP status for debugging
  getOtpStatus(phone: string): { exists: boolean, expires?: number, attempts?: number } {
    const otpData = this.otpStore[phone];
    if (!otpData) {
      return { exists: false };
    }
    return {
      exists: true,
      expires: otpData.expires,
      attempts: otpData.attempts
    };
  }

  // Clear expired OTPs (cleanup method)
  clearExpiredOtps(): void {
    const now = Date.now();
    Object.keys(this.otpStore).forEach(phone => {
      if (this.otpStore[phone].expires < now) {
        delete this.otpStore[phone];
      }
    });
  }
}

export const authService = new AuthService();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  authService.clearExpiredOtps();
}, 5 * 60 * 1000);