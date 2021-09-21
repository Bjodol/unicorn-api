// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { Schema } from "jsonschema";
import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { getDBResourceClient } from "../../db-client";
import { SchemaValidationError } from "../../errors";

export const schema: Schema = {
  id: "Entry",
  required: ["nickname", "phoneNo", "colors", "equipment"],
  properties: {
    createdAt: {
      type: "string",
      pattern:
        /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
      description: "must be an ISO date-time string",
    },
    nickname: {
      type: "string",
      description: "must be a string and is required",
    },
    phoneNo: {
      type: "string",
      description: "must be a string and is required",
    },
    colors: {
      type: "array",
      description: "must be a array and is required",
      items: {
        type: "object",
        required: ["pathId", "color"],
        properties: {
          pathId: {
            type: "string",
            description: "must be a string and is required",
          },
          color: {
            type: "string",
            description: "must be a string and is required",
          },
        },
      },
    },
    equipment: {
      type: "string",
      description: "must be a string and is required",
    },
  },
};

export type UnicornColor = {
  pathId: string;
  color: string;
};

export type Unicorn = {
  _id?: ObjectId;
  nickname: string;
  createdAt?: string;
  phoneNo: string;
  colors: UnicornColor[];
  equipment: string;
};

export const collectionName = "unicorns";
export const { list, create } = getDBResourceClient<Unicorn>({
  collectionName,
  limit: 25,
  schema,
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, method } = req;
  try {
    switch (method.toUpperCase()) {
      case "GET": {
        const data = await list({});
        res.status(200).json(data);
        break;
      }
      case "POST": {
        const unicorn: Unicorn = {
          ...body,
          createdAt: new Date().toISOString(),
        };
        const data = await create(unicorn);
        res.status(200).json(data);
        break;
      }
      case "OPTIONS": {
        res.header("Access-Control-Allow-Methods", "POST, GET");
        res.status(200).json({});
        break;
      }
      default: {
        res.status(400).json({ message: "Method not found" });
        break;
      }
    }
  } catch (e) {
    if (e instanceof SchemaValidationError) {
      res.status(400).json(e.errors);
    } else {
      console.error(e);
      res.status(500).json(JSON.stringify(e));
    }
  }
};

export default handler;
