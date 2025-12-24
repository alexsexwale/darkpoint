"use client";

import { useState } from "react";
import { AccountLayout, AddressEditModal, type Address } from "@/components/account";
import { Button } from "@/components/ui";

// Mock addresses
const initialAddresses: Address[] = [
  {
    id: "1",
    type: "billing",
    name: "John Doe",
    address1: "123 Main Street",
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    country: "South Africa",
    phone: "+27 21 123 4567",
  },
  {
    id: "2",
    type: "shipping",
    name: "John Doe",
    address1: "456 Delivery Lane",
    address2: "Unit 5",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2000",
    country: "South Africa",
  },
];

function AddressCard({
  address,
  onEdit,
}: {
  address: Address;
  onEdit: () => void;
}) {
  return (
    <div className="bg-[var(--color-dark-2)] p-6">
      <h3 className="font-heading text-xl mb-4 capitalize">
        {address.type} Address
      </h3>
      <div className="text-white/70 space-y-1 mb-6">
        <p className="text-white">{address.name}</p>
        {address.company && <p>{address.company}</p>}
        <p>{address.address1}</p>
        {address.address2 && <p>{address.address2}</p>}
        <p>
          {address.city}, {address.province} {address.postalCode}
        </p>
        <p>{address.country}</p>
        {address.phone && <p>{address.phone}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

export function AddressesPageClient() {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    type: "billing" | "shipping";
    address: Address | null;
  }>({
    isOpen: false,
    type: "billing",
    address: null,
  });

  const billingAddress = addresses.find((a) => a.type === "billing");
  const shippingAddress = addresses.find((a) => a.type === "shipping");

  const handleEdit = (type: "billing" | "shipping") => {
    const address = addresses.find((a) => a.type === type) || null;
    setEditModal({
      isOpen: true,
      type,
      address,
    });
  };

  const handleSave = (savedAddress: Address) => {
    setAddresses((prev) => {
      const existingIndex = prev.findIndex((a) => a.id === savedAddress.id);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = savedAddress;
        return updated;
      } else {
        // Add new
        return [...prev, savedAddress];
      }
    });
  };

  const handleCloseModal = () => {
    setEditModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <AccountLayout title="Addresses">
        <p className="text-white/70 mb-8">
          The following addresses will be used on the checkout page by default.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {billingAddress ? (
            <AddressCard
              address={billingAddress}
              onEdit={() => handleEdit("billing")}
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
              onEdit={() => handleEdit("shipping")}
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
      </AccountLayout>

      {/* Edit Modal */}
      <AddressEditModal
        isOpen={editModal.isOpen}
        onClose={handleCloseModal}
        address={editModal.address}
        type={editModal.type}
        onSave={handleSave}
      />
    </>
  );
}
