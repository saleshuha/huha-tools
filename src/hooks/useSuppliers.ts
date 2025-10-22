import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Supplier, SupplierContact, CreateSupplier, CreateSupplierContact } from '@/types/supplier';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadSuppliers = async (country?: string, isActive?: boolean) => {
    setLoading(true);
    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('supplier_name', { ascending: true });

      if (country) {
        query = query.eq('country', country);
      }
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading suppliers',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSupplier = async (supplier: CreateSupplier) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          ...supplier,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Supplier created',
        description: 'Supplier has been added successfully',
      });

      await loadSuppliers();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error creating supplier',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<CreateSupplier>) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Supplier updated',
        description: 'Changes saved successfully',
      });

      await loadSuppliers();
    } catch (error: any) {
      toast({
        title: 'Error updating supplier',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Supplier deleted',
        description: 'Supplier has been removed',
      });

      await loadSuppliers();
    } catch (error: any) {
      toast({
        title: 'Error deleting supplier',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const loadSupplierContacts = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_primary', { ascending: false })
        .order('contact_name', { ascending: true });

      if (error) throw error;
      return data as SupplierContact[];
    } catch (error: any) {
      toast({
        title: 'Error loading contacts',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const addSupplierContact = async (contact: CreateSupplierContact) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('supplier_contacts')
        .insert({
          ...contact,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Contact added',
        description: 'Contact has been added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error adding contact',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateSupplierContact = async (id: string, updates: Partial<CreateSupplierContact>) => {
    try {
      const { error } = await supabase
        .from('supplier_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Contact updated',
        description: 'Changes saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating contact',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteSupplierContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('supplier_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Contact deleted',
        description: 'Contact has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting contact',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    loadSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    loadSupplierContacts,
    addSupplierContact,
    updateSupplierContact,
    deleteSupplierContact,
  };
};
