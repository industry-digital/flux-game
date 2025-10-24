import { ActorURN, GroupURN, ItemURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { Group } from '~/types/entity/group';
import { Place } from '~/types/entity/place';
import { Item } from '~/types/entity/item';
import { AbstractSession } from '~/types/session';

export type WorldProjection = {
  actors: Record<ActorURN, Actor>;
  groups: Record<GroupURN<any>, Group>;
  places: Record<PlaceURN, Place>;
  items: Record<ItemURN, Item>;
  sessions: Record<SessionURN, AbstractSession<any, any>>;
};
