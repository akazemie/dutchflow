export interface MessageDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export function message(
  key: string,
  params?: Record<string, string | number>,
): MessageDescriptor {
  return params ? { key, params } : { key };
}
