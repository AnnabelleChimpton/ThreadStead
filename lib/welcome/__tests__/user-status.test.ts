import { isNewUser, getUserExperience } from '../user-status';

describe('User Status Logic', () => {
  describe('isNewUser', () => {
    it('should return false for null user', () => {
      expect(isNewUser(null)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isNewUser(undefined)).toBe(false);
    });

    it('should return true for user with valid newUser metadata flag', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(),
        metadata: {
          isNewUser: true,
          newUserExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
        }
      };
      
      expect(isNewUser(user)).toBe(true);
    });

    it('should return false for user with expired newUser metadata flag', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(),
        metadata: {
          isNewUser: true,
          newUserExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should return true for user less than 3 days old with fewer than 3 rings', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        threadRingMemberships: [
          { threadRingId: 'ring1' },
          { threadRingId: 'ring2' }
        ]
      };
      
      expect(isNewUser(user)).toBe(true);
    });

    it('should return false for user less than 3 days old with 3 or more rings', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        threadRingMemberships: [
          { threadRingId: 'ring1' },
          { threadRingId: 'ring2' },
          { threadRingId: 'ring3' }
        ]
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should return false for user more than 3 days old regardless of ring count', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        threadRingMemberships: [
          { threadRingId: 'ring1' }
        ]
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should handle user with string createdAt', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        threadRingMemberships: [
          { threadRingId: 'ring1' }
        ]
      };
      
      expect(isNewUser(user)).toBe(true);
    });

    it('should return false for user with no createdAt', () => {
      const user = {
        id: 'user1',
        createdAt: null as any,
        threadRingMemberships: []
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should return false for user with invalid createdAt', () => {
      const user = {
        id: 'user1',
        createdAt: 'invalid-date',
        threadRingMemberships: []
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should handle user with undefined threadRingMemberships', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        threadRingMemberships: undefined
      };
      
      expect(isNewUser(user)).toBe(true);
    });

    it('should handle user with empty threadRingMemberships array', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        threadRingMemberships: []
      };
      
      expect(isNewUser(user)).toBe(true);
    });

    it('should prioritize metadata flag over fallback logic', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (would be regular)
        threadRingMemberships: [
          { threadRingId: 'ring1' },
          { threadRingId: 'ring2' },
          { threadRingId: 'ring3' },
          { threadRingId: 'ring4' },
          { threadRingId: 'ring5' }
        ],
        metadata: {
          isNewUser: true,
          newUserExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Still valid
        }
      };
      
      expect(isNewUser(user)).toBe(true);
    });
  });

  describe('getUserExperience', () => {
    it('should return "new" for new user', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        threadRingMemberships: []
      };
      
      expect(getUserExperience(user)).toBe('new');
    });

    it('should return "regular" for regular user', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        threadRingMemberships: [
          { threadRingId: 'ring1' },
          { threadRingId: 'ring2' },
          { threadRingId: 'ring3' }
        ]
      };
      
      expect(getUserExperience(user)).toBe('regular');
    });

    it('should return "regular" for null user', () => {
      expect(getUserExperience(null)).toBe('regular');
    });

    it('should return "regular" for undefined user', () => {
      expect(getUserExperience(undefined)).toBe('regular');
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 3 days old user with exactly 3 rings', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Exactly 3 days ago
        threadRingMemberships: [
          { threadRingId: 'ring1' },
          { threadRingId: 'ring2' },
          { threadRingId: 'ring3' }
        ]
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should handle user with Date object that has invalid time', () => {
      const user = {
        id: 'user1',
        createdAt: new Date('invalid'),
        threadRingMemberships: []
      };
      
      expect(isNewUser(user)).toBe(false);
    });

    it('should handle metadata without expiration date', () => {
      const user = {
        id: 'user1',
        createdAt: new Date(),
        metadata: {
          isNewUser: true
          // No newUserExpiresAt
        }
      };
      
      // Should fall back to age/ring logic since no expiration is set
      expect(isNewUser(user)).toBe(true);
    });
  });
});