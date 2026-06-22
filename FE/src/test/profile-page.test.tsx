import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Profile from "../pages/Profile";

const uploadAvatar = vi.fn();
const deleteResume = vi.fn();
const downloadResume = vi.fn();
const refreshUser = vi.fn();
const toast = vi.fn();

let mockUser: {
  id: string;
  email: string;
  created_at: string;
  full_name: string;
  avatar_url: string | null;
  resume_uploaded: boolean;
  resume_filename: string | null;
};

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: mockUser,
    refreshUser,
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (_section: string, key: string) => key,
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("../lib/api", () => ({
  profileApi: {
    uploadAvatar: (...args: unknown[]) => uploadAvatar(...args),
    deleteAvatar: vi.fn(),
    uploadResume: vi.fn(),
    deleteResume: (...args: unknown[]) => deleteResume(...args),
    downloadResume: (...args: unknown[]) => downloadResume(...args),
  },
}));

describe("Profile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: "user-1",
      email: "candidate@example.com",
      created_at: "2026-05-05T00:00:00Z",
      full_name: "Candidate",
      avatar_url: "https://cdn.example/avatar.png",
      resume_uploaded: true,
      resume_filename: "candidate-resume.pdf",
    };
    downloadResume.mockResolvedValue({
      blob: new Blob(["resume"]),
      filename: null,
    });
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:resume"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  it("uploads a new avatar from the hidden file input", async () => {
    const { container } = render(<Profile />);
    const avatarInput = container.querySelector(
      'input[type="file"][accept="image/png,image/jpeg,image/webp"]',
    ) as HTMLInputElement | null;
    expect(avatarInput).toBeTruthy();

    const file = new File(["avatar-bytes"], "avatar.png", { type: "image/png" });
    fireEvent.change(avatarInput as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadAvatar).toHaveBeenCalledWith(file);
      expect(refreshUser).toHaveBeenCalledTimes(1);
    });
  });

  it("deletes the current resume from the profile page", async () => {
    render(<Profile />);

    fireEvent.click(screen.getByRole("button", { name: /delete resume/i }));

    await waitFor(() => {
      expect(deleteResume).toHaveBeenCalledTimes(1);
      expect(refreshUser).toHaveBeenCalledTimes(1);
    });
  });
});
