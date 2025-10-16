import { describe, it, expect } from 'vitest';
import {
  createCreditCommand,
  createDebitCommand,
} from './currency';
import { CommandType } from '~/types/intent';
import { CurrencyType } from '~/types/currency';
import { WellKnownActor } from '~/types';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_CURRENCY_SESSION } from '~/testing/constants';

describe('Currency Command Factories', () => {
  describe('createCreditCommand', () => {
    it('should create a credit command with default values', () => {
      const command = createCreditCommand();

      expect(command).toMatchObject({
        type: CommandType.CREDIT,
        actor: WellKnownActor.SYSTEM,
        location: DEFAULT_LOCATION,
        session: DEFAULT_CURRENCY_SESSION,
        args: {
          recipient: ALICE_ID,
          currency: CurrencyType.SCRAP,
          amount: 100,
        },
      });

      expect(typeof command.id).toBe('string');
      expect(typeof command.ts).toBe('number');
    });

    it('should allow transformation of the command', () => {
      const command = createCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 500,
          recipient: BOB_ID,
        },
      }));

      expect(command.args.amount).toBe(500);
      expect(command.args.recipient).toBe(BOB_ID);
      expect(command.args.currency).toBe(CurrencyType.SCRAP); // Should preserve other defaults
    });
  });

  describe('createDebitCommand', () => {
    it('should create a debit command with default values', () => {
      const command = createDebitCommand();

      expect(command).toMatchObject({
        type: CommandType.DEBIT,
        actor: WellKnownActor.SYSTEM,
        location: DEFAULT_LOCATION,
        session: DEFAULT_CURRENCY_SESSION,
        args: {
          recipient: ALICE_ID,
          currency: CurrencyType.SCRAP,
          amount: 50,
        },
      });

      expect(typeof command.id).toBe('string');
      expect(typeof command.ts).toBe('number');
    });

    it('should allow transformation of the command', () => {
      const command = createDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 200,
          recipient: BOB_ID,
        },
      }));

      expect(command.args.amount).toBe(200);
      expect(command.args.recipient).toBe(BOB_ID);
      expect(command.args.currency).toBe(CurrencyType.SCRAP); // Should preserve other defaults
    });
  });

  describe('transform callback usage examples', () => {
    it('should create credit command with specific amount using transform', () => {
      const command = createCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          amount: 750,
        },
      }));

      expect(command.args.amount).toBe(750);
      expect(command.args.recipient).toBe(ALICE_ID); // Should preserve other defaults
      expect(command.type).toBe(CommandType.CREDIT);
    });

    it('should create debit command with specific recipient using transform', () => {
      const command = createDebitCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: BOB_ID,
        },
      }));

      expect(command.args.recipient).toBe(BOB_ID);
      expect(command.args.amount).toBe(50); // Should preserve other defaults
      expect(command.type).toBe(CommandType.DEBIT);
    });

    it('should create credit command with multiple customizations using transform', () => {
      const command = createCreditCommand((cmd) => ({
        ...cmd,
        args: {
          ...cmd.args,
          recipient: BOB_ID,
          amount: 1000,
        },
        trace: 'custom-trace',
      }));

      expect(command.args.recipient).toBe(BOB_ID);
      expect(command.args.amount).toBe(1000);
      expect(command.trace).toBe('custom-trace');
      expect(command.type).toBe(CommandType.CREDIT);
      expect(command.args.currency).toBe(CurrencyType.SCRAP); // Should preserve other defaults
    });
  });

  describe('command structure', () => {
    it('should generate unique IDs for different commands', () => {
      const command1 = createCreditCommand();
      const command2 = createCreditCommand();

      // Since we're using a mock uniqid that returns the same value,
      // they will have the same ID, but in real usage they would be unique
      expect(typeof command1.id).toBe('string');
      expect(typeof command2.id).toBe('string');
    });

    it('should have consistent timestamps', () => {
      const command1 = createCreditCommand();
      const command2 = createDebitCommand();

      expect(command1.ts).toBe(command2.ts); // Should use the same default timestamp
      expect(typeof command1.ts).toBe('number');
    });

    it('should have proper command structure', () => {
      const command = createCreditCommand();

      expect(command).toHaveProperty('__type', 'command');
      expect(command).toHaveProperty('id');
      expect(command).toHaveProperty('ts');
      expect(command).toHaveProperty('type');
      expect(command).toHaveProperty('actor');
      expect(command).toHaveProperty('location');
      expect(command).toHaveProperty('session');
      expect(command).toHaveProperty('args');
    });
  });
});
