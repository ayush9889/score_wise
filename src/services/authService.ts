import { User, Group, GroupMember, Invitation } from '../types/auth';
import { storageService } from './storage';

class AuthService {
  private currentUser: User | null = null;
  private currentGroups: Group[] = [];
  private otpStore: { [phone: string]: string } = {}; // In-memory OTP store for demo

  // Authentication
  async signUp(email: string, password: string, name: string, phone?: string): Promise<User> {
    // Simulate API call
    const user: User = {
      id: `user_${Date.now()}`,
      email,
      name,
      phone,
      isVerified: false,
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
    // Simulate API call
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

  // Group Management
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

  // OTP logic
  async sendOTP(phone: string): Promise<void> {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore[phone] = otp;
    // In a real app, send the OTP via SMS here
    console.log(`OTP for ${phone}: ${otp}`); // For demo
  }

  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    if (this.otpStore[phone] && this.otpStore[phone] === otp) {
      // Mark user as verified
      const user = await storageService.getUserByPhone(phone);
      if (user) {
        user.isVerified = true;
        await storageService.saveUser(user);
        if (this.currentUser && this.currentUser.phone === phone) {
          this.currentUser.isVerified = true;
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
      }
      delete this.otpStore[phone];
      return true;
    }
    return false;
  }

  async resendOTP(phone: string): Promise<void> {
    await this.sendOTP(phone);
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
}

export const authService = new AuthService();