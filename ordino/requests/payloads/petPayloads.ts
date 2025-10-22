export interface PetPayload {
  id?: number;
  name: string;
  category: { id: number; name: string };
  photoUrls: string[];
  tags: { id: number; name: string }[];
  status: "available" | "pending" | "sold";
}

export const newPet: PetPayload = {
  name: "Charlie",
  category: { id: 1, name: "dog" },
  photoUrls: ["https://example.com/photo1.jpg"],
  tags: [{ id: 1, name: "cute" }],
  status: "available",
};

export const updatePet: PetPayload = {
  name: "Charlie Updated",
  category: { id: 1, name: "dog" },
  photoUrls: ["https://example.com/photo1_updated.jpg"],
  tags: [{ id: 1, name: "playful" }],
  status: "pending",
};
