export type MetaMapping = {
  lang: string | null,
  currLang: string,
  highlight: boolean;
  notificationRegistered: boolean;
  lastSyncTime: number;
  user: string | null;
  token: string | null;
  loggedIn: boolean;
  online: boolean,
}

export type MetaKey = keyof MetaMapping;
export type MetaValue<K extends MetaKey> = MetaMapping[K];
