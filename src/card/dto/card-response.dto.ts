export class CardResponseDto {
  id: number;
  cardSerial: string;
  publicKey: string;
  pointBalance: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
    dob: Date | null;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}
