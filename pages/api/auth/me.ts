import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user }) => {
    if (!user) return res.status(200).json({ loggedIn: false });
    res.json({
      loggedIn: true,
      user: { 
        id: user.id, 
        did: user.did, 
        role: user.role,
        primaryHandle: user.primaryHandle ?? null,
        // Set while their account is set to be deleted (lib/domain/users/leaving.ts)
        deletesAt: user.deletesAt ?? null,
      },
    });
  }
);
