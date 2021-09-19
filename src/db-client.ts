import {
  Db,
  Filter,
  MongoClient,
  OptionalId,
  WithId,
} from "mongodb";

const { MONGODB_DB_URI: uri, DB_NAME: dbName } = process.env;

export const dbClient = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any);

import { Schema, Validator } from "jsonschema";
import { SchemaValidationError } from "./errors";
export type DatabaseCallback<DataObject> = (db: Db) => Promise<DataObject>;

export const withDB = async <DataObject>(
  callback: DatabaseCallback<DataObject>
) => {
  try {
    await dbClient.connect();
    const db = dbClient.db(dbName);
    const object = await callback(db);
    return object;
  } finally {
    dbClient.close();
  }
};

const validator = new Validator();

export const isValidResource = <R>(
  resource: any,
  schema: Schema
): resource is R => {
  const { valid } = validator.validate(resource, schema, {
    allowUnknownAttributes: false,
  });
  return valid;
};

export const getErrors = (resource: any, schema: Schema) =>
  validator.validate(resource, schema).errors;

export type DBResourceOption = {
  collectionName: string;
  limit: number;
  schema: Schema;
};

export const getResource = async <R>(
  resource: WithId<R>,
  { collectionName }: DBResourceOption
): Promise<R> =>
  await withDB((db) => {
    const collection = db.collection<R>(collectionName);
    return collection.findOne(resource);
  });

export const listResource = async <R>(
  resource: OptionalId<R>,
  { collectionName, limit }: DBResourceOption
): Promise<R[]> =>
  await withDB((db) => {
    const collection = db.collection<R>(collectionName);
    return collection.find(resource).limit(limit).toArray();
  });

export const createResource = async <R>(
  resource: R,
  { collectionName, schema, ...rest }: DBResourceOption
): Promise<R> => {
  if (!isValidResource(resource, schema))
    throw new SchemaValidationError(getErrors(resource, schema));
  return await withDB(async (db) => {
    const collection = db.collection<R>(collectionName);
    const { insertedId } = await collection.insertOne(
      resource as OptionalId<R>
    );
    return getResource<R>({ _id: insertedId } as WithId<R>, {
      collectionName,
      schema,
      ...rest,
    });
  });
};

export const updateResource = async <R>(
  query: WithId<R>,
  resource: Partial<R>,
  { collectionName, schema, ...rest }: DBResourceOption
): Promise<R> => {
  if (!isValidResource(resource, schema))
    throw new SchemaValidationError(getErrors(resource, schema));
  return await withDB(async (db) => {
    const collection = db.collection<R>(collectionName);
    await collection.updateOne(query, { $set: resource });
    console.log({ query, resource });
    return getResource<R>(query, {
      collectionName,
      schema,
      ...rest,
    });
  });
};

export const getDBResourceClient = <R>(options: DBResourceOption) => ({
  get: (resource: Filter<WithId<Partial<R>>>) =>
    getResource(resource as WithId<Partial<R>>, options),
  list: (resource: Filter<OptionalId<Partial<R>>>) =>
    listResource(resource as OptionalId<Partial<R>>, options),
  create: (resource: R) => createResource(resource, options),
  update: (query: WithId<R>, resource: Partial<R>) =>
    updateResource(query, resource, options),
});
