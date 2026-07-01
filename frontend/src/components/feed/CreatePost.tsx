import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image, Smile, MapPin, Globe, Users, Lock, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postService } from "@/services/mockApi";
import { uploadFile } from "@/services/apiClient";
import React, { useState, useRef } from "react";
import { toast } from "sonner";

export function CreatePost({ groupId }: { groupId?: string }) {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  const [location, setLocation] = useState("");
  const [feeling, setFeeling] = useState("");
  
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showFeelingInput, setShowFeelingInput] = useState(false);
  const [showPrivacySelect, setShowPrivacySelect] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      let finalPostText = text;
      if (feeling.trim()) {
        finalPostText += ` — feeling ${feeling.trim()}`;
      }
      if (location.trim()) {
        finalPostText += ` at ${location.trim()}`;
      }
      return postService.createPost({
        text: finalPostText,
        image: image || undefined,
        privacy,
        groupId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      if (groupId) {
        qc.invalidateQueries({ queryKey: ["group-posts", groupId] });
      }
      setText("");
      setImage("");
      setFeeling("");
      setLocation("");
      setShowLocationInput(false);
      setShowFeelingInput(false);
      setShowPrivacySelect(false);
      toast.success("Post shared");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to share post");
    }
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadFile(file);
      setImage(res.url);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  const privacyConfig = {
    public: { Icon: Globe, label: "Public" },
    followers: { Icon: Users, label: "Followers" },
    private: { Icon: Lock, label: "Only me" },
  };

  const ActivePrivacyIcon = privacyConfig[privacy].Icon;

  return (
    <div className="surface-card p-4 relative">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`What's on your mind, ${user.name.split(" ")[0]}?`}
            rows={2}
            className="w-full resize-none bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Form fields for location & feeling */}
          <div className="space-y-2 mt-2">
            {showFeelingInput && (
              <div className="flex items-center gap-2 bg-accent/50 rounded-md px-2 py-1 text-xs max-w-xs border">
                <Smile className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="How are you feeling?"
                  className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground"
                />
                <button onClick={() => { setFeeling(""); setShowFeelingInput(false); }} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {showLocationInput && (
              <div className="flex items-center gap-2 bg-accent/50 rounded-md px-2 py-1 text-xs max-w-xs border">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where are you?"
                  className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground"
                />
                <button onClick={() => { setLocation(""); setShowLocationInput(false); }} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Uploaded Image Preview */}
          {image && (
            <div className="relative mt-3 inline-block rounded-md overflow-hidden border max-w-xs">
              <img src={image} alt="Upload preview" className="max-h-40 object-cover rounded-md" />
              <button
                onClick={() => setImage("")}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/80 hover:bg-background text-foreground shadow transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/*"
            className="hidden"
          />

          <div className="mt-2 flex items-center justify-between border-t pt-3 relative">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePhotoClick}
                disabled={uploading}
                className="text-muted-foreground gap-1.5 h-8"
              >
                <Image className="h-4 w-4" /> 
                <span className="hidden sm:inline">{uploading ? "Uploading..." : "Photo"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeelingInput(!showFeelingInput)}
                className="text-muted-foreground gap-1.5 h-8"
              >
                <Smile className="h-4 w-4" /> 
                <span className="hidden sm:inline">Feeling</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationInput(!showLocationInput)}
                className="text-muted-foreground gap-1.5 h-8"
              >
                <MapPin className="h-4 w-4" /> 
                <span className="hidden sm:inline">Location</span>
              </Button>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivacySelect(!showPrivacySelect)}
                  className="text-muted-foreground gap-1.5 h-8"
                >
                  <ActivePrivacyIcon className="h-4 w-4" /> 
                  <span className="hidden sm:inline">{privacyConfig[privacy].label}</span>
                </Button>

                {showPrivacySelect && (
                  <div className="absolute left-0 bottom-full mb-1 bg-popover text-popover-foreground rounded-md shadow-lg border p-1 z-50 w-36">
                    {(Object.keys(privacyConfig) as Array<keyof typeof privacyConfig>).map((k) => {
                      const ItemIcon = privacyConfig[k].Icon;
                      return (
                        <button
                          key={k}
                          onClick={() => {
                            setPrivacy(k);
                            setShowPrivacySelect(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                        >
                          <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{privacyConfig[k].label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Button
              size="sm"
              disabled={(!text.trim() && !image) || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
