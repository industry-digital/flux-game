import { KindOfItem } from '~/types/entity/item';
import { PhysicalEntitySchema } from '~/types/schema/schema';
import { SchemaURN, ItemType } from '~/types/taxonomy';

export type AbstractItemSchema<TKind extends KindOfItem> = PhysicalEntitySchema<SchemaURN<TKind extends ItemType ? TKind : never>>;
