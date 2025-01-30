
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_HOST: string;
      MONGODB_USERNAME: string;
      MONGODB_PASSWORD: string;
      MONGODB_DB_NAME: string;
    }
  }
}

export function getMongoConnectionString(): string {
  if (!process.env.MONGODB_HOST) {
    throw new Error("MONGODB_HOST environment variable not set");
  }
  if (!process.env.MONGODB_USERNAME) {
    throw new Error("MONGODB_USERNAME environment variable not set");
  }
  if (!process.env.MONGODB_PASSWORD) {
    throw new Error("MONGODB_PASSWORD environment variable not set");
  }
  if (!process.env.MONGODB_DB_NAME) {
    throw new Error("MONGODB_DB_NAME environment variable not set");
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log(
      `[getMongoConnectionString] ` +
      `Creating connection URI for user "${process.env.MONGODB_USERNAME}" on db "${process.env.MONGODB_DB_NAME}" @ host: "${process.env.MONGODB_HOST}"`
    );
  }

  const MONGODB_HOST: string = process.env.MONGODB_HOST;

  let protocol: 'mongodb' | 'mongodb+srv';
  if (MONGODB_HOST.includes(".mongodb.net")) {
    protocol = 'mongodb+srv';
  } else if (MONGODB_HOST.includes("localhost")) {
    protocol = 'mongodb';
  } else {
    if (process.env.NODE_ENV === 'development') {
      protocol = 'mongodb';
    } else {
      protocol = 'mongodb+srv';
    }
  }

  const searchParams = new URLSearchParams();
  searchParams.set('retryWrites', 'true');
  searchParams.set('w', 'majority');

  if (MONGODB_HOST.includes('schemavaultsauth.vll7y61.mongodb.net')) {
    searchParams.set('appName', 'SchemaVaultsAuth');
  }

  const connection_string = `${protocol}://${process.env.MONGODB_USERNAME
    }:${process.env.MONGODB_PASSWORD
    }@${MONGODB_HOST
    }/${process.env.MONGODB_DB_NAME
    }?${searchParams.toString()}`;

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[getMongoConnectionString] ` +
      `Generated connection URI: "${connection_string}"`
    );
  }

  return connection_string;
}
