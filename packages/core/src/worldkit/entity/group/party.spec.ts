import { describe, it, expect, beforeEach } from 'vitest';
import { createPartyApi, PartyApi, DEFAULT_MAX_PARTY_SIZE } from './party';
import { GroupApiContext } from './api';
import { ActorURN } from '~/types/taxonomy';
import { createTransformerContext } from '~/worldkit/context';

describe('Party API', () => {
  let context: GroupApiContext;
  let partyApi: PartyApi;

  beforeEach(() => {
    context = createTransformerContext();
    partyApi = createPartyApi(context);
  });

  describe('addPartyMember', () => {
    it('should enforce DEFAULT_MAX_PARTY_SIZE for parties', () => {
      const party = partyApi.createParty((defaults) => defaults);

      // Add members up to the limit
      for (let i = 0; i < DEFAULT_MAX_PARTY_SIZE; i++) {
        partyApi.addPartyMember(party, `flux:actor:test${i}` as ActorURN);
      }

      expect(party.size).toBe(DEFAULT_MAX_PARTY_SIZE);

      // Adding one more should throw
      expect(() => {
        partyApi.addPartyMember(party, 'flux:actor:overflow' as ActorURN);
      }).toThrow(`Party ${party.id} is at maximum capacity (${DEFAULT_MAX_PARTY_SIZE} members)`);
    });

    it('should respect custom party size policy', () => {
      const customPolicy = { maxSize: 5 };
      const customPartyApi = createPartyApi(context, customPolicy);
      const party = customPartyApi.createParty((defaults) => defaults);

      // Add members up to the custom limit
      for (let i = 0; i < customPolicy.maxSize; i++) {
        customPartyApi.addPartyMember(party, `flux:actor:test${i}` as ActorURN);
      }

      expect(party.size).toBe(customPolicy.maxSize);

      // Adding one more should throw with custom limit
      expect(() => {
        customPartyApi.addPartyMember(party, 'flux:actor:overflow' as ActorURN);
      }).toThrow(`Party ${party.id} is at maximum capacity (${customPolicy.maxSize} members)`);
    });
  });
});
