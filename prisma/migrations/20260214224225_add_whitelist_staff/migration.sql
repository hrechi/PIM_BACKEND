-- CreateTable
CREATE TABLE "whitelist_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whitelist_staff_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "whitelist_staff" ADD CONSTRAINT "whitelist_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
