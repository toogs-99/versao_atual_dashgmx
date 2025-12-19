import { useState, useEffect } from "react";

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
    // Realtime removed
  }, []);

  const fetchFieldConfig = async () => {
    try {
      // MOCK DATA
      const mockFields: FieldConfig[] = [
        { id: "1", field_name: "truck_plate", display_name: "Placas", visible_in_card: true, visible_in_table: true, display_order: 1, field_type: "text" },
        { id: "2", field_name: "vehicle_type", display_name: "Tipo de Veículo", visible_in_card: true, visible_in_table: true, display_order: 2, field_type: "select" },
        { id: "3", field_name: "current_location", display_name: "Localização", visible_in_card: true, visible_in_table: true, display_order: 3, field_type: "text" },
        { id: "4", field_name: "phone", display_name: "Telefone", visible_in_card: true, visible_in_table: true, display_order: 4, field_type: "text" },
        { id: "5", field_name: "city", display_name: "Cidade", visible_in_card: true, visible_in_table: true, display_order: 5, field_type: "text" },
        { id: "6", field_name: "state", display_name: "Estado", visible_in_card: true, visible_in_table: true, display_order: 6, field_type: "text" },
      ];

      setAllFields(mockFields);
      setCardFields(mockFields.filter(f => f.visible_in_card));
      setTableFields(mockFields.filter(f => f.visible_in_table));

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
