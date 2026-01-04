"use client";

import { useState, useEffect } from "react";
import { AccountLayout } from "@/components/account";
import { Button, PhoneInput, formatPhoneForDisplay } from "@/components/ui";
import { useAccountStore, useAuthStore, useGamificationStore } from "@/stores";
import { motion, AnimatePresence } from "framer-motion";
import type { UserAddress } from "@/stores/accountStore";
import type { AddressType } from "@/types/database";

interface AddressFormData {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string;
}

const emptyFormData: AddressFormData = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  province: "",
  postal_code: "",
  country: "South Africa",
  phone: "",
};

function AddressCard({
  address,
  onEdit,
  onDelete,
  isDeleting,
}: {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="bg-[var(--color-dark-2)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl capitalize">
          {address.type} Address
        </h3>
        {address.is_default && (
          <span className="text-xs px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)]">
            Default
          </span>
        )}
      </div>
      <div className="text-white/70 space-y-1 mb-6">
        <p className="text-white">{address.name}</p>
        <p>{address.address_line1}</p>
        {address.address_line2 && <p>{address.address_line2}</p>}
        <p>
          {address.city}, {address.province} {address.postal_code}
        </p>
        <p>{address.country}</p>
        {address.phone && <p>{formatPhoneForDisplay(address.phone)}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDelete}
          disabled={isDeleting}
          className="text-red-400 border-red-400/30 hover:bg-red-500/10"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}

function AddressEditModal({
  isOpen,
  onClose,
  address,
  type,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  address: UserAddress | null;
  type: AddressType;
  onSave: (data: AddressFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const { userProfile } = useGamificationStore();
  const [formData, setFormData] = useState<AddressFormData>(emptyFormData);

  useEffect(() => {
    if (address) {
      // Editing existing address - use address data
      setFormData({
        name: address.name,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || "",
        city: address.city,
        province: address.province,
        postal_code: address.postal_code,
        country: address.country,
        phone: address.phone || "",
      });
    } else {
      // Adding new address - pre-fill name from user profile
      setFormData({
        ...emptyFormData,
        name: userProfile?.display_name || "",
        phone: userProfile?.phone || "",
      });
    }
  }, [address, isOpen, userProfile]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={onClose}
          >
            <div
              className="w-full max-w-lg bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative p-6 border-b border-[var(--color-dark-3)]">
                <h2 className="text-xl font-heading capitalize">
                  {address ? "Edit" : "Add"} {type} Address
                </h2>
                <button
                  onClick={onClose}
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-[var(--muted-foreground)] hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Full Name <span className="text-[var(--color-main-1)]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Street Address <span className="text-[var(--color-main-1)]">*</span>
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    required
                    placeholder="House number and street name"
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      City <span className="text-[var(--color-main-1)]">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Province <span className="text-[var(--color-main-1)]">*</span>
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                    >
                      <option value="">Select Province</option>
                      <option value="Eastern Cape">Eastern Cape</option>
                      <option value="Free State">Free State</option>
                      <option value="Gauteng">Gauteng</option>
                      <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                      <option value="Limpopo">Limpopo</option>
                      <option value="Mpumalanga">Mpumalanga</option>
                      <option value="North West">North West</option>
                      <option value="Northern Cape">Northern Cape</option>
                      <option value="Western Cape">Western Cape</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Postal Code <span className="text-[var(--color-main-1)]">*</span>
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      disabled
                      className="w-full px-4 py-3 bg-[var(--color-dark-4)] border border-[var(--color-dark-4)] text-white/50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Phone (optional)</label>
                  <PhoneInput
                    name="phone"
                    value={formData.phone}
                    onChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-white/50 mt-1">
                    Enter South African number (e.g., 072 123 4567)
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="primary" type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      "Save Address"
                    )}
                  </Button>
                  <Button variant="outline" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function AddressesPageClient() {
  const { user } = useAuthStore();
  const { addresses, isLoadingAddresses, fetchAddresses, addAddress, updateAddress, deleteAddress } = useAccountStore();
  
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    type: AddressType;
    address: UserAddress | null;
  }>({
    isOpen: false,
    type: "billing",
    address: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const billingAddress = addresses.find((a) => a.type === "billing");
  const shippingAddress = addresses.find((a) => a.type === "shipping");

  const handleEdit = (type: AddressType, address: UserAddress | null = null) => {
    setEditModal({ isOpen: true, type, address });
    setMessage(null);
  };

  const handleSave = async (formData: AddressFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    setMessage(null);

    try {
      if (editModal.address) {
        // Update existing
        const result = await updateAddress(editModal.address.id, {
          name: formData.name,
          company: null,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
          country: formData.country,
          phone: formData.phone || null,
        });

        if (!result.success) throw new Error(result.error);
        setMessage({ type: "success", text: "Address updated successfully!" });
      } else {
        // Add new
        const result = await addAddress({
          user_id: user.id,
          type: editModal.type,
          name: formData.name,
          company: null,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
          country: formData.country,
          phone: formData.phone || null,
        });

        if (!result.success) throw new Error(result.error);
        setMessage({ type: "success", text: "Address added successfully!" });
      }

      setEditModal((prev) => ({ ...prev, isOpen: false }));
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to save address" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setMessage(null);

    try {
      const result = await deleteAddress(id);
      if (!result.success) throw new Error(result.error);
      setMessage({ type: "success", text: "Address deleted successfully!" });
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to delete address" 
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseModal = () => {
    setEditModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <AccountLayout title="Addresses">
        <p className="text-white/70 mb-6">
          The following addresses will be used on the checkout page by default.
        </p>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-4 rounded mb-6 ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {isLoadingAddresses ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[var(--color-dark-2)] p-6 animate-pulse">
                <div className="h-6 bg-[var(--color-dark-3)] rounded w-1/3 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-2/3" />
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-1/2" />
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {billingAddress ? (
              <AddressCard
                address={billingAddress}
                onEdit={() => handleEdit("billing", billingAddress)}
                onDelete={() => handleDelete(billingAddress.id)}
                isDeleting={deletingId === billingAddress.id}
              />
            ) : (
              <div className="bg-[var(--color-dark-2)] p-6">
                <h3 className="font-heading text-xl mb-4">Billing Address</h3>
                <p className="text-white/70 mb-6">
                  You have not set up this address yet.
                </p>
                <Button variant="outline" size="sm" onClick={() => handleEdit("billing")}>
                  Add
                </Button>
              </div>
            )}

            {shippingAddress ? (
              <AddressCard
                address={shippingAddress}
                onEdit={() => handleEdit("shipping", shippingAddress)}
                onDelete={() => handleDelete(shippingAddress.id)}
                isDeleting={deletingId === shippingAddress.id}
              />
            ) : (
              <div className="bg-[var(--color-dark-2)] p-6">
                <h3 className="font-heading text-xl mb-4">Shipping Address</h3>
                <p className="text-white/70 mb-6">
                  You have not set up this address yet.
                </p>
                <Button variant="outline" size="sm" onClick={() => handleEdit("shipping")}>
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </AccountLayout>

      <AddressEditModal
        isOpen={editModal.isOpen}
        onClose={handleCloseModal}
        address={editModal.address}
        type={editModal.type}
        onSave={handleSave}
        isLoading={isSaving}
      />
    </>
  );
}
