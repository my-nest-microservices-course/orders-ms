export class Product {
  id: number;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  available: boolean;
}

// id        Int      @id @default(autoincrement())
//   name      String
//   price     Float
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//   available Boolean  @default(true)
