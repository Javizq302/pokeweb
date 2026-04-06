-- CreateTable
CREATE TABLE "Folder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "folderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPokemon" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "pokemonName" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "nickname" TEXT,
    "item" TEXT,
    "ability" TEXT,
    "move1" TEXT,
    "move2" TEXT,
    "move3" TEXT,
    "move4" TEXT,
    "nature" TEXT,
    "evs" TEXT,
    "ivs" TEXT,

    CONSTRAINT "TeamPokemon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamPokemon_teamId_slot_key" ON "TeamPokemon"("teamId", "slot");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPokemon" ADD CONSTRAINT "TeamPokemon_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
