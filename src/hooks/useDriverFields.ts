import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FieldConfig {
  id: string;
  field_name: string;
  display_name: string;
  visible_in_card: boolean;
  visible_in_table: boolean;
  display_order: number;
  field_type: string;
}

export const useDriverFields = () => {
  const [cardFields, setCardFields] = useState<FieldConfig[]>([]);
  const [tableFields, setTableFields] = useState<FieldConfig[]>([]);
  const [allFields, setAllFields] = useState<FieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFieldConfig();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('field-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_field_config'
        },
        () => {
          fetchFieldConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFieldConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("driver_field_config")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data) {
        setAllFields(data);
        setCardFields(data.filter(f => f.visible_in_card));
        setTableFields(data.filter(f => f.visible_in_table));
      }
    } catch (error) {
      console.error("Error fetching field config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cardFields,
    tableFields,
    allFields,
    isLoading,
    refetch: fetchFieldConfig
  };
};
