import { SchemaLoader } from '~/types/schema/loader';
import { AmmoSchema } from '~/types/schema/ammo';
import { AmmoSchemaURN } from '~/types/taxonomy';
import { arrowSchema } from '../ammo/arrow';
import { pistolRoundSchema, rifleRoundSchema, shotgunShellSchema } from '~/worldkit/schema/ammo/bullet';

export const loadAmmoSchemas: SchemaLoader<AmmoSchemaURN, AmmoSchema> = () => {
  return new Map<AmmoSchemaURN, AmmoSchema>([
    [arrowSchema.urn, arrowSchema],
    [pistolRoundSchema.urn, pistolRoundSchema],
    [rifleRoundSchema.urn, rifleRoundSchema],
    [shotgunShellSchema.urn, shotgunShellSchema],
  ]);
};
