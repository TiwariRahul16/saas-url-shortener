import { prisma } from "../../shared/database/prisma";

export const urlRepository = {
  async createUrl(userId: string, originalUrl: string, expiresAt?: Date) {
    return prisma.url.create({
      data: {
        userId,
        originalUrl,
        expiresAt,
      },
    });
  },

  async findById(id: bigint) {
    return prisma.url.findUnique({
      where: { id },
    });
  },
};
