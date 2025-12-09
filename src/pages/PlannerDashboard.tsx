import React, { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-enterprise";
import "ag-grid-enterprise";
import "@/styles/ag-grid-custom.css";
import { supabase } from "@/integrations/supabase/client";
import { configureAGGridLicense, defaultGridOptions, agGridContainerStyles, commonAgGridConfig } from "@/lib/ag-grid-config";
import { myTheme } from "@/lib/m8-grid-theme.js";
import { toast } from "sonner";
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsStock from 'highcharts/modules/stock';

// Initialize Highcharts Stock module
try {
  (HighchartsStock as any)(Highcharts);
} catch (error) {
  console.warn('Highcharts Stock module could not be loaded:', error);
}

const PlannerDashboard: React.FC = () => {
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [subcategoryData, setSubcategoryData] = useState<any[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allHierarchyData, setAllHierarchyData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<any | null>(null);
  const [classItemsData, setClassItemsData] = useState<any[]>([]);
  const [loadingClassItems, setLoadingClassItems] = useState<boolean>(false);
  const [selectedSubcategoryChild, setSelectedSubcategoryChild] = useState<any | null>(null);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState<boolean>(false);
  const [forecastDetailData, setForecastDetailData] = useState<any[]>([]);
  const [loadingForecastDetail, setLoadingForecastDetail] = useState<boolean>(false);
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [loadingPivot, setLoadingPivot] = useState<boolean>(false);
  const [updatedCells, setUpdatedCells] = useState<Set<string>>(new Set());

  const columnDefs: ColDef[] = useMemo(() => {
    return [
      {
        field: "category",
        headerName: "Categoría",
        filter: true,
        sortable: true,
        resizable: true,
        width: 300,
      },
    ];
  }, []);

  const subcategoryColumnDefs: ColDef[] = useMemo(() => {
    return [
      {
        field: "name",
        headerName: "Subcategoría",
        filter: true,
        sortable: true,
        resizable: true,
        width: 300,
        valueGetter: (params: any) => {
          // Try different possible field names
          return params.data?.name || 
                 params.data?.subcategory_name || 
                 params.data?.subcategory || 
                 params.data?.label || 
                 '';
        },
      },
    ];
  }, []);

  const classesColumnDefs: ColDef[] = useMemo(() => {
    return [
      {
        field: "subcategory_child",
        headerName: "Subcategoría Child",
        filter: true,
        sortable: true,
        resizable: true,
        width: 300,
      },
    ];
  }, []);

  const classItemsColumnDefs: ColDef[] = useMemo(() => {
    return [
      {
        field: "class",
        headerName: "Clase",
        filter: true,
        sortable: true,
        resizable: true,
        width: 300,
      },
    ];
  }, []);



  const forecastDetailColumnDefs: ColDef[] = useMemo(() => {
    return [
      {
        field: "category_name",
        headerName: "Categoría",
        filter: true,
        sortable: true,
        resizable: true,
        width: 180,
        rowGroup: true,
        hide: true,
      },
      {
        field: "subcategory_name",
        headerName: "Subcategoría",
        filter: true,
        sortable: true,
        resizable: true,
        width: 180,
      },
      {
        field: "subclass_name",
        headerName: "Subclase",
        filter: true,
        sortable: true,
        resizable: true,
        width: 180,
      },
      {
        field: "class_name",
        headerName: "Clase",
        filter: true,
        sortable: true,
        resizable: true,
        width: 180,
      },
      {
        field: "postdate",
        headerName: "Fecha",
        filter: true,
        sortable: true,
        resizable: true,
        width: 120,
        valueFormatter: (params: any) => {
          if (!params.value) return "";
          const date = new Date(params.value);
          return date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
        },
      },
      {
        field: "forecast_ly",
        headerName: "Forecast LY",
        filter: true,
        sortable: true,
        resizable: true,
        width: 150,
        valueFormatter: (params: any) => {
          if (params.value === null || params.value === undefined) return "";
          return Number(params.value).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
      {
        field: "forecast",
        headerName: "Forecast",
        filter: true,
        sortable: true,
        resizable: true,
        width: 150,
        valueFormatter: (params: any) => {
          if (params.value === null || params.value === undefined) return "";
          return Number(params.value).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
      {
        field: "fitted_history",
        headerName: "Historial Ajustado",
        filter: true,
        sortable: true,
        resizable: true,
        width: 150,
        valueFormatter: (params: any) => {
          if (params.value === null || params.value === undefined) return "";
          return Number(params.value).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
      {
        field: "commercial_input",
        headerName: "Input Comercial",
        filter: true,
        sortable: true,
        resizable: true,
        width: 150,
        valueFormatter: (params: any) => {
          if (params.value === null || params.value === undefined) return "";
          return Number(params.value).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
      {
        field: "customer_node_id",
        headerName: "Cliente",
        filter: true,
        sortable: true,
        resizable: true,
        width: 150,
      },
    ];
  }, []);

  useEffect(() => {
    // SEO basics
    const title = "Planner Dashboard | M8 Platform";
    document.title = title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta(
      "description",
      "Dashboard del Planner mostrando la jerarquía de productos desde product_hierarchy_mv"
    );

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  useEffect(() => {
    configureAGGridLicense();
    fetchData();
  }, []);

  // Update subcategories when category is selected or when data is loaded
  useEffect(() => {
    
    if (allHierarchyData.length > 0 && selectedCategory) {
      fetchSubcategoryData(selectedCategory);
    }
  }, [selectedCategory, allHierarchyData]);

  // Update classes when subcategory is selected
  useEffect(() => {
    
    if (selectedSubcategory) {
      fetchClassesData(selectedSubcategory);
    } else {
      setClassesData([]);
    }
  }, [selectedSubcategory]);

  // Update class items when subcategory_child is selected
  useEffect(() => {
    if (selectedSubcategoryChild) {
      fetchClassItemsData(selectedSubcategoryChild);
    } else {
      setClassItemsData([]);
    }
  }, [selectedSubcategoryChild]);

  // Update products when class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchProductsData(selectedClass);
    } else {
      setProductsData([]);
    }
  }, [selectedClass]);

  // Update chart when category, subcategory, subcategory child, or class is selected
  useEffect(() => {
    
    if (selectedClass && selectedSubcategoryChild && selectedSubcategory && selectedCategory) {
      // If class is selected, use class function
      const subcategoryName = selectedSubcategory.name || 
                             selectedSubcategory.subcategory_name || 
                             selectedSubcategory.subcategory || 
                             selectedSubcategory.label || 
                             '';
      const subcategoryChildName = selectedSubcategoryChild.subcategory_child || 
                                  selectedSubcategoryChild.name || 
                                  selectedSubcategoryChild.label || 
                                  '';
      fetchChartDataByClass(selectedCategory, subcategoryName, subcategoryChildName, selectedClass);
    } else if (selectedSubcategoryChild && selectedSubcategory && selectedCategory) {
      // If subcategory child is selected, use subclass function
      const subcategoryName = selectedSubcategory.name || 
                             selectedSubcategory.subcategory_name || 
                             selectedSubcategory.subcategory || 
                             selectedSubcategory.label || 
                             '';
      const subcategoryChildName = selectedSubcategoryChild.subcategory_child || 
                                  selectedSubcategoryChild.name || 
                                  selectedSubcategoryChild.label || 
                                  '';
      fetchChartDataBySubclass(selectedCategory, subcategoryName, subcategoryChildName);
    } else if (selectedSubcategory && selectedCategory) {
      // If subcategory is selected, use subcategory function
      const subcategoryName = selectedSubcategory.name || 
                             selectedSubcategory.subcategory_name || 
                             selectedSubcategory.subcategory || 
                             selectedSubcategory.label || 
                             '';
      fetchChartDataBySubcategory(selectedCategory, subcategoryName);
    } else if (selectedCategory) {
      fetchChartData(selectedCategory);
    } else {
      setChartData([]);
    }
  }, [selectedCategory, selectedSubcategory, selectedSubcategoryChild, selectedClass]);

  // Update forecast detail data when selection changes
  useEffect(() => {
    fetchForecastDetailData();
    fetchPivotData();
  }, [selectedCategory, selectedSubcategory, selectedSubcategoryChild, selectedClass]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .schema("m8_schema")
        .from("product_hierarchy_mv")
        .select("category, subcategories")
        .order("category");

      if (error) throw error;
      
      
      if (data && data.length > 0) {
        if (data[0].subcategories) {
          if (Array.isArray(data[0].subcategories)) {
            if (data[0].subcategories.length > 0) {
            }
          }
        }
      }
      
      // Store all data for filtering
      setAllHierarchyData(data || []);
      
      // Extract unique categories for the first grid
      const categories = (data || []).map((row: any) => ({ category: row.category }));
      setRowData(categories);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching product hierarchy:", err);
      toast.error("Error cargando jerarquía de productos");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoryData = async (category: string | null) => {
    
    if (!category) {
      setSubcategoryData([]);
      return;
    }

    try {
      setLoadingSubcategories(true);
      
      // Find the row with the selected category
      const categoryRow = allHierarchyData.find((row: any) => row.category === category);
      
      
      if (!categoryRow) {
        setSubcategoryData([]);
        return;
      }
      
      
      if (!categoryRow.subcategories) {
        setSubcategoryData([]);
        return;
      }

      // Extract subcategory nodes
      let subcategories: any[] = [];
      
      // Handle different possible structures
      if (Array.isArray(categoryRow.subcategories)) {
        subcategories = categoryRow.subcategories;
      } else if (typeof categoryRow.subcategories === 'object' && categoryRow.subcategories !== null) {
        // If it's a single object, wrap it in an array
        subcategories = [categoryRow.subcategories];
      } 

      
      setSubcategoryData(subcategories);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching subcategories:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando subcategorías");
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const handleCategorySelection = (event: any) => {

    const selectedRows = event.api.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      const category = selectedRows[0].category;
      setSelectedCategory(category);
      fetchSubcategoryData(category);
      // Clear subcategory and classes when category changes
      setSelectedSubcategory(null);
      setClassesData([]);
      setSelectedSubcategoryChild(null);
      setClassItemsData([]);
      setSelectedClass(null);
      setProductsData([]);
    } else {
      console.log("[PlannerDashboard] No category selected, clearing");
      setSelectedCategory(null);
      setSubcategoryData([]);
      setSelectedSubcategory(null);
      setClassesData([]);
      setSelectedSubcategoryChild(null);
      setClassItemsData([]);
    }
  };

  const handleRowClicked = (event: any) => {
    if (event.data && event.data.category) {
      const category = event.data.category;
      setSelectedCategory(category);
      fetchSubcategoryData(category);
      // Also manually select the row
      event.node.setSelected(true);
    }
  };

  const fetchClassesData = async (subcategory: any) => {
    console.log("[PlannerDashboard] fetchClassesData called with subcategory:", subcategory);
    
    if (!subcategory) {
      console.log("[PlannerDashboard] No subcategory provided, clearing classes data");
      setClassesData([]);
      return;
    }

    try {
      setLoadingClasses(true);
      
      // Get the subcategory name from the selected subcategory object
      const subcategoryName = subcategory.name || 
                             subcategory.subcategory_name || 
                             subcategory.subcategory || 
                             subcategory.label || 
                             '';
      
      console.log("[PlannerDashboard] Looking for subcategory name:", subcategoryName);
      console.log("[PlannerDashboard] All hierarchy data length:", allHierarchyData.length);
      
      // Find the row in allHierarchyData that contains this subcategory
      const categoryRow = allHierarchyData.find((row: any) => {
        if (!row.subcategories) return false;
        
        // Check if subcategories is an array
        if (Array.isArray(row.subcategories)) {
          return row.subcategories.some((sub: any) => {
            const subName = sub.name || sub.subcategory_name || sub.subcategory || sub.label || '';
            return subName === subcategoryName;
          });
        }
        return false;
      });
      
      console.log("[PlannerDashboard] Category row found:", categoryRow ? "YES" : "NO");
      
      if (!categoryRow || !categoryRow.subcategories) {
        console.log("[PlannerDashboard] Category row or subcategories not found");
        setClassesData([]);
        return;
      }
      
      // Find the specific subcategory object
      let subcategoryObj: any = null;
      if (Array.isArray(categoryRow.subcategories)) {
        subcategoryObj = categoryRow.subcategories.find((sub: any) => {
          const subName = sub.name || sub.subcategory_name || sub.subcategory || sub.label || '';
          return subName === subcategoryName;
        });
      }
      
      console.log("[PlannerDashboard] Subcategory object found:", subcategoryObj ? "YES" : "NO");
      
      if (!subcategoryObj) {
        console.log("[PlannerDashboard] Subcategory object not found");
        setClassesData([]);
        return;
      }
      
      console.log("[PlannerDashboard] Subcategory object keys:", Object.keys(subcategoryObj));
      console.log("[PlannerDashboard] Subcategory object:", JSON.stringify(subcategoryObj, null, 2));
      
      // Extract subclasses array
      const subclasses = subcategoryObj.subclasses;
      
      console.log("[PlannerDashboard] Subclasses found:", !!subclasses);
      console.log("[PlannerDashboard] Subclasses type:", typeof subclasses);
      console.log("[PlannerDashboard] Subclasses isArray:", Array.isArray(subclasses));
      
      if (!subclasses || !Array.isArray(subclasses)) {
        console.log("[PlannerDashboard] No subclasses array found");
        setClassesData([]);
        return;
      }
      
      console.log("[PlannerDashboard] Subclasses length:", subclasses.length);
      
      // Extract subcategory_child from each subclass item
      const classesData = subclasses.map((subclass: any) => {
        return {
          subcategory_child: subclass.subcategory_child || subclass.name || subclass.label || '',
          classes: subclass.classes || []
        };
      }).filter((item: any) => item.subcategory_child); // Filter out items without subcategory_child
      
      console.log("[PlannerDashboard] Final classes data length:", classesData.length);
      console.log("[PlannerDashboard] Final classes data:", JSON.stringify(classesData, null, 2));
      
      setClassesData(classesData);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching classes:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando clases");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSubcategorySelection = (event: any) => {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      const subcategory = selectedRows[0];
      setSelectedSubcategory(subcategory);
      fetchClassesData(subcategory);
      // Clear subcategory_child when subcategory changes
      setSelectedSubcategoryChild(null);
      setClassItemsData([]);
      setSelectedClass(null);
      setProductsData([]);
    } else {
      setSelectedSubcategory(null);
      setClassesData([]);
      setSelectedSubcategoryChild(null);
      setClassItemsData([]);
    }
  };

  const handleSubcategoryRowClicked = (event: any) => {
    console.log("[PlannerDashboard] handleSubcategoryRowClicked called, event.data:", event.data);
    if (event.data) {
      const subcategory = event.data;
      console.log("[PlannerDashboard] Subcategory row clicked:", subcategory);
      setSelectedSubcategory(subcategory);
      fetchClassesData(subcategory);
      // Also manually select the row
      event.node.setSelected(true);
    }
  };

  const fetchClassItemsData = async (subcategoryChild: any) => {
    console.log("[PlannerDashboard] fetchClassItemsData called with subcategoryChild:", subcategoryChild);
    
    if (!subcategoryChild) {
      console.log("[PlannerDashboard] No subcategoryChild provided, clearing class items data");
      setClassItemsData([]);
      return;
    }

    try {
      setLoadingClassItems(true);
      
      // The subcategoryChild object should have a classes array
      const classes = subcategoryChild.classes || [];
      
      console.log("[PlannerDashboard] Classes found:", !!classes);
      console.log("[PlannerDashboard] Classes type:", typeof classes);
      console.log("[PlannerDashboard] Classes isArray:", Array.isArray(classes));
      console.log("[PlannerDashboard] Classes value:", classes);
      
      if (!Array.isArray(classes)) {
        console.log("[PlannerDashboard] Classes is not an array");
        setClassItemsData([]);
        return;
      }
      
      // Map classes to objects with a 'class' field for the grid
      const classItems = classes.map((className: string) => ({
        class: className
      }));
      
      console.log("[PlannerDashboard] Final class items array length:", classItems.length);
      console.log("[PlannerDashboard] Final class items:", JSON.stringify(classItems, null, 2));
      
      setClassItemsData(classItems);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching class items:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando clases");
    } finally {
      setLoadingClassItems(false);
    }
  };

  const handleSubcategoryChildSelection = (event: any) => {
    console.log("[PlannerDashboard] handleSubcategoryChildSelection called");
    const selectedRows = event.api.getSelectedRows();
    console.log("[PlannerDashboard] Selected subcategory child rows:", selectedRows);
    if (selectedRows && selectedRows.length > 0) {
      const subcategoryChild = selectedRows[0];
      console.log("[PlannerDashboard] Subcategory child selected:", subcategoryChild);
      setSelectedSubcategoryChild(subcategoryChild);
      fetchClassItemsData(subcategoryChild);
      // Clear class when subcategory_child changes
      setSelectedClass(null);
      setProductsData([]);
    } else {
      console.log("[PlannerDashboard] No subcategory child selected, clearing");
      setSelectedSubcategoryChild(null);
      setClassItemsData([]);
      setSelectedClass(null);
      setProductsData([]);
    }
  };

  const handleSubcategoryChildRowClicked = (event: any) => {
    console.log("[PlannerDashboard] handleSubcategoryChildRowClicked called, event.data:", event.data);
    if (event.data) {
      const subcategoryChild = event.data;
      console.log("[PlannerDashboard] Subcategory child row clicked:", subcategoryChild);
      setSelectedSubcategoryChild(subcategoryChild);
      fetchClassItemsData(subcategoryChild);
      // Clear class when subcategory_child changes
      setSelectedClass(null);
      setProductsData([]);
      // Also manually select the row
      event.node.setSelected(true);
    }
  };

  const fetchProductsData = async (subclassName: string | null) => {
    console.log("[PlannerDashboard] fetchProductsData called with subclassName:", subclassName);
    
    if (!subclassName) {
      console.log("[PlannerDashboard] No subclassName provided, clearing products data");
      setProductsData([]);
      return;
    }

    try {
      setLoadingProducts(true);
      console.log("[PlannerDashboard] Fetching products with subclass_name:", subclassName);
      
      const { data, error } = await (supabase as any)
        .schema("m8_schema")
        .from("products")
        .select("*")
        .eq("class_name", subclassName)
        .order("product_id");

      if (error) throw error;
      
      console.log("[PlannerDashboard] Products fetched:", data?.length || 0);
      console.log("[PlannerDashboard] First product sample:", data?.[0]);
      
      setProductsData(data || []);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching products:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando productos");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleClassSelection = (event: any) => {
    console.log("[PlannerDashboard] handleClassSelection called");
    const selectedRows = event.api.getSelectedRows();
    console.log("[PlannerDashboard] Selected class rows:", selectedRows);
    if (selectedRows && selectedRows.length > 0) {
      const classItem = selectedRows[0];
      const className = classItem.class;
      console.log("[PlannerDashboard] Class selected:", className);
      setSelectedClass(className);
      fetchProductsData(className);
    } else {
      console.log("[PlannerDashboard] No class selected, clearing");
      setSelectedClass(null);
      setProductsData([]);
    }
  };

  const handleClassRowClicked = (event: any) => {
    console.log("[PlannerDashboard] handleClassRowClicked called, event.data:", event.data);
    if (event.data && event.data.class) {
      const className = event.data.class;
      console.log("[PlannerDashboard] Class row clicked:", className);
      setSelectedClass(className);
      fetchProductsData(className);
      // Also manually select the row
      event.node.setSelected(true);
    }
  };

  // Chart component for forecast vs actual
  const ChartComponent = ({ data }: { data: any[] }) => {
    const chartRef = React.useRef<HighchartsReact.RefObject>(null);

    // Prepare data for Highcharts - filter out zero values
    const forecastData = data
      .map(item => [
        new Date(item.postdate).getTime(),
        item.total_forecast || 0
      ])
      .filter((point): point is [number, number] => 
        point[1] !== null && 
        point[1] !== undefined && 
        point[1] !== 0
      );

    const actualData = data
      .map(item => [
        new Date(item.postdate).getTime(),
        item.total_actual || 0
      ])
      .filter((point): point is [number, number] => 
        point[1] !== null && 
        point[1] !== undefined && 
        point[1] !== 0
      );

    const options: Highcharts.Options = {
      chart: {
        type: 'line',
        height: 600,
        zooming: {
          type: 'x'
        },
        reflow: false,
        spacingTop: 10,
        spacingRight: 10,
        spacingBottom: 10,
        spacingLeft: 10
      },
      title: {
        text: undefined
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Fecha',
          style: {
            color: '#374151',
            fontSize: '12px',
            fontWeight: '600'
          }
        },
        labels: {
          style: {
            color: '#374151'
          },
          rotation: -45,
          formatter: function() {
            if (this.value) {
              const date = new Date(this.value);
              return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
            }
            return '';
          }
        },
        gridLineColor: '#E5E7EB',
        lineColor: '#E5E7EB',
        tickColor: '#E5E7EB'
      },
      yAxis: {
        title: {
          text: 'Cantidad',
          style: {
            color: '#374151',
            fontSize: '12px',
            fontWeight: '600'
          }
        },
        labels: {
          style: {
            color: '#374151'
          },
          formatter: function() {
            return new Intl.NumberFormat('en-US').format(this.value as number);
          }
        },
        gridLineColor: '#E5E7EB',
        lineColor: '#E5E7EB'
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function() {
          let tooltip = `<b>${this.x ? new Date(this.x).toLocaleDateString('es-ES') : ''}</b><br/>`;
          this.points?.forEach(point => {
            if (point.y !== null && point.y !== undefined) {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${new Intl.NumberFormat('en-US').format(point.y)}</b><br/>`;
            }
          });
          return tooltip;
        }
      },
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemStyle: {
          color: '#374151',
          fontSize: '12px',
          fontWeight: '500'
        },
        itemMarginBottom: 5,
        itemMarginTop: 0
      },
      plotOptions: {
        line: {
          marker: {
            enabled: true,
            radius: 3
          },
          lineWidth: 2,
          animation: false
        },
        series: {
          turboThreshold: 0
        }
      },
      series: [
        {
          type: 'line',
          name: 'Forecast',
          data: forecastData,
          color: '#EF4444',
          lineWidth: 3,
          marker: { radius: 4 }
        },
        {
          type: 'line',
          name: 'Historia',
          data: actualData,
          color: '#3B82F6',
          lineWidth: 3,
          marker: { radius: 4 }
        }
      ],
      credits: {
        enabled: false
      }
    };

    return (
      <div className="w-full" style={{ height: '600px' }}>
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          options={options}
          constructorType={'stockChart'}
        />
      </div>
    );
  };

  const fetchChartData = async (category: string | null) => {

    
    if (!category) {

      setChartData([]);
      return;
    }

    try {
      setLoadingChart(true);

      
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('get_forecast_vs_actual_by_category', {
          p_category_name: category
        });

      if (error) throw error;
      
      // Ensure data is sorted by postdate
      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.postdate).getTime();
        const dateB = new Date(b.postdate).getTime();
        return dateA - dateB;
      });
      
      setChartData(sortedData);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching chart data:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando datos del gráfico");
    } finally {
      setLoadingChart(false);
    }
  };

  const fetchChartDataBySubcategory = async (category: string | null, subcategory: string | null) => {
    console.log("[PlannerDashboard] fetchChartDataBySubcategory called with category:", category, "subcategory:", subcategory);
    
    if (!category || !subcategory) {
      console.log("[PlannerDashboard] No category or subcategory provided, clearing chart data");
      setChartData([]);
      return;
    }

    try {
      setLoadingChart(true);
      console.log("[PlannerDashboard] Calling RPC function get_forecast_vs_actual_by_subcategory with category:", category, "subcategory:", subcategory);
      
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('get_forecast_vs_actual_by_subcategory', {
          p_category: category,
          p_subcategory_name: subcategory
        });

      if (error) throw error;
      
      console.log("[PlannerDashboard] Chart data fetched:", data?.length || 0);
      console.log("[PlannerDashboard] First chart data sample:", JSON.stringify(data?.[0], null, 2));
      console.log("[PlannerDashboard] Chart data keys:", data?.[0] ? Object.keys(data[0]) : []);
      
      // Ensure data is sorted by postdate
      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.postdate).getTime();
        const dateB = new Date(b.postdate).getTime();
        return dateA - dateB;
      });
      
      setChartData(sortedData);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching chart data by subcategory:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando datos del gráfico");
    } finally {
      setLoadingChart(false);
    }
  };

  const fetchChartDataBySubclass = async (category: string | null, subcategory: string | null, subcategoryChild: string | null) => {
    console.log("[PlannerDashboard] fetchChartDataBySubclass called with category:", category, "subcategory:", subcategory, "subcategoryChild:", subcategoryChild);
    
    if (!category || !subcategory || !subcategoryChild) {
      console.log("[PlannerDashboard] Missing parameters, clearing chart data");
      setChartData([]);
      return;
    }

    try {
      setLoadingChart(true);
      console.log("[PlannerDashboard] Calling RPC function get_forecast_vs_actual_by_subclass with category:", category, "subcategory:", subcategory, "subcategoryChild:", subcategoryChild);
      
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('get_forecast_vs_actual_by_subclass', {
          p_category: category,
          p_subcategory_name: subcategory,
          p_subclass_name : subcategoryChild
        });

      if (error) throw error;
      
      console.log("[PlannerDashboard] Chart data fetched:", data?.length || 0);
      console.log("[PlannerDashboard] First chart data sample:", JSON.stringify(data?.[0], null, 2));
      console.log("[PlannerDashboard] Chart data keys:", data?.[0] ? Object.keys(data[0]) : []);
      
      // Ensure data is sorted by postdate
      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.postdate).getTime();
        const dateB = new Date(b.postdate).getTime();
        return dateA - dateB;
      });
      
      setChartData(sortedData);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching chart data by subclass:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando datos del gráfico");
    } finally {
      setLoadingChart(false);
    }
  };

  const fetchChartDataByClass = async (category: string | null, subcategory: string | null, subcategoryChild: string | null, className: string | null) => {
    console.log("[PlannerDashboard] fetchChartDataByClass called with category:", category, "subcategory:", subcategory, "subcategoryChild:", subcategoryChild, "className:", className);
    
    if (!category || !subcategory || !subcategoryChild || !className) {
      console.log("[PlannerDashboard] Missing parameters, clearing chart data");
      setChartData([]);
      return;
    }

    try {
      setLoadingChart(true);
      console.log("[PlannerDashboard] Calling RPC function get_forecast_vs_actual_by_class with category:", category, "subcategory:", subcategory, "subcategoryChild:", subcategoryChild, "className:", className);
      
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('get_forecast_vs_actual_by_class', {
          p_category: category,
          p_subcategory_name: subcategory,
          p_subclass_name: subcategoryChild,
          p_class_name: className
        });

      if (error) throw error;
      
      console.log("[PlannerDashboard] Chart data fetched:", data?.length || 0);
      console.log("[PlannerDashboard] First chart data sample:", JSON.stringify(data?.[0], null, 2));
      console.log("[PlannerDashboard] Chart data keys:", data?.[0] ? Object.keys(data[0]) : []);
      
      // Ensure data is sorted by postdate
      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.postdate).getTime();
        const dateB = new Date(b.postdate).getTime();
        return dateA - dateB;
      });
      
      setChartData(sortedData);
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching chart data by class:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando datos del gráfico");
    } finally {
      setLoadingChart(false);
    }
  };

  const fetchForecastDetailData = async () => {

    
    if (!selectedCategory) {
      setForecastDetailData([]);
      return;
    }
    
    try {
      setLoadingForecastDetail(true);
      
      // First, get product IDs based on selected level
      let productIds: string[] = [];
      
      if (selectedClass) {
        // Filter by class - use product IDs from productsData
        if (productsData.length > 0) {
          productIds = productsData.map((p: any) => p.product_id).filter(Boolean);
          console.log("[PlannerDashboard] Filtering by class, product IDs:", productIds.length);
        } else {
          // Get products by class from products table
          const { data: products, error: productsError } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('category_name', selectedCategory)
            .eq('class_name', selectedClass);
          
          if (productsError) throw productsError;
          productIds = products?.map((p: any) => p.product_id).filter(Boolean) || [];
          console.log("[PlannerDashboard] Filtering by class from products table, product IDs:", productIds.length);
        }
      } else if (selectedSubcategoryChild && selectedSubcategory) {
        // Filter by subcategory child
        const subcategoryName = selectedSubcategory.name || 
                               selectedSubcategory.subcategory_name || 
                               selectedSubcategory.subcategory || 
                               selectedSubcategory.label || 
                               '';
        const subcategoryChildName = selectedSubcategoryChild.subcategory_child || 
                                    selectedSubcategoryChild.name || 
                                    selectedSubcategoryChild.label || 
                                    '';
        
        const { data: products, error: productsError } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .eq('category_name', selectedCategory)
          .eq('subcategory_name', subcategoryName)
          .eq('subclass_name', subcategoryChildName);
        
        if (productsError) throw productsError;
        productIds = products?.map((p: any) => p.product_id).filter(Boolean) || [];
        console.log("[PlannerDashboard] Filtering by subcategory child, product IDs:", productIds.length);
      } else if (selectedSubcategory) {
        // Filter by subcategory
        const subcategoryName = selectedSubcategory.name || 
                               selectedSubcategory.subcategory_name || 
                               selectedSubcategory.subcategory || 
                               selectedSubcategory.label || 
                               '';
        
        const { data: products, error: productsError } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .eq('category_name', selectedCategory)
          .eq('subcategory_name', subcategoryName);
        
        if (productsError) throw productsError;
        productIds = products?.map((p: any) => p.product_id).filter(Boolean) || [];
      }
      
      if (productIds.length === 0) {
        setForecastDetailData([]);
        return;
      }
      
      // Now get forecast data for these products
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('forecast_with_fitted_history')
        .select(`
          product_id,
          postdate,
          forecast_ly,
          forecast,
          fitted_history,
          commercial_input,
          customer_node_id
        `)
        .in('product_id', productIds)
        .order('product_id', { ascending: true })
        .order('postdate', { ascending: true });

      if (error) throw error;
      
      console.log("[PlannerDashboard] Forecast detail data fetched:", data?.length || 0);
      
      // Join with products table to get product names and hierarchy information
      if (data && data.length > 0) {
        const uniqueProductIds = [...new Set(data.map((item: any) => item.product_id).filter(Boolean))];
        const { data: products, error: productsError } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id, product_name, category_name, subcategory_name, subclass_name, class_name')
          .in('product_id', uniqueProductIds);
        
        if (!productsError && products) {
          const productMap = new Map(products.map((p: any) => [
            p.product_id, 
            {
              product_name: p.product_name,
              category_name: p.category_name,
              subcategory_name: p.subcategory_name,
              subclass_name: p.subclass_name,
              class_name: p.class_name,
            }
          ]));
          const enrichedData = data.map((item: any) => {
            const productInfo = productMap.get(item.product_id) as {
              product_name?: string;
              category_name?: string;
              subcategory_name?: string;
              subclass_name?: string;
              class_name?: string;
            } | undefined;
            return {
              ...item,
              product_name: productInfo?.product_name || item.product_id,
              category_name: productInfo?.category_name || null,
              subcategory_name: productInfo?.subcategory_name || null,
              subclass_name: productInfo?.subclass_name || null,
              class_name: productInfo?.class_name || null,
            };
          });
          setForecastDetailData(enrichedData);
        } else {
          setForecastDetailData(data);
        }
      } else {
        setForecastDetailData([]);
      }
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching forecast detail data:", err);
      console.error("[PlannerDashboard] Error stack:", err.stack);
      toast.error("Error cargando datos de forecast detallado");
      setForecastDetailData([]);
    } finally {
      setLoadingForecastDetail(false);
    }
  };

  const fetchPivotData = async () => {
    
    if (!selectedCategory) {
      setPivotData([]);
      return;
    }
    
    try {
      setLoadingPivot(true);
      
      // First, get product IDs based on selected level
      let productIds: string[] = [];
      
      if (selectedClass) {
        // Get products by class
        const { data: products } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .eq('category_name', selectedCategory)
          .eq('class_name', selectedClass);
        
        if (products && products.length > 0) {
          productIds = products.map((p: any) => p.product_id).filter(Boolean);
        } else {
          setPivotData([]);
          return;
        }
      } else if (selectedSubcategoryChild && selectedSubcategory) {
        const subcategoryName = selectedSubcategory.name || 
                               selectedSubcategory.subcategory_name || 
                               selectedSubcategory.subcategory || 
                               selectedSubcategory.label || 
                               '';
        const subcategoryChildName = selectedSubcategoryChild.subcategory_child || 
                                    selectedSubcategoryChild.name || 
                                    selectedSubcategoryChild.label || 
                                    '';
        
        const { data: products } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .eq('category_name', selectedCategory)
          .eq('subcategory_name', subcategoryName)
          .eq('subclass_name', subcategoryChildName);
        
        if (products && products.length > 0) {
          productIds = products.map((p: any) => p.product_id).filter(Boolean);
        } else {
          setPivotData([]);
          return;
        }
      } else if (selectedSubcategory) {
        const subcategoryName = selectedSubcategory.name || 
                               selectedSubcategory.subcategory_name || 
                               selectedSubcategory.subcategory || 
                               selectedSubcategory.label || 
                               '';
        
        const { data: products } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .eq('category_name', selectedCategory)
          .eq('subcategory_name', subcategoryName);
        
        if (products && products.length > 0) {
          productIds = products.map((p: any) => p.product_id).filter(Boolean);
        } else {
          setPivotData([]);
          return;
        }
      } else {
        // Filter by category only
        const { data: products } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id, subcategory_name')
          .eq('category_name', selectedCategory);
        
        if (products && products.length > 0) {
          productIds = products.map((p: any) => p.product_id).filter(Boolean);
          console.log("[PlannerDashboard] Products found for category:", products.length);
          console.log("[PlannerDashboard] Unique subcategories in products:", [...new Set(products.map((p: any) => p.subcategory_name).filter(Boolean))]);
        } else {
          setPivotData([]);
          return;
        }
      }

      if (productIds.length === 0) {
        setPivotData([]);
        return;
      }

      // Get forecast data directly from forecast_data table (this filters products with data)
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('forecast_data')
        .select(`
          product_id,
          postdate,
          forecast,
          actual,
          sales_plan,
          forecast_ly,
          commercial_input
        `)
        .in('product_id', productIds)
        .order('product_id', { ascending: true })
        .order('postdate', { ascending: true });

      if (error) throw error;
      
      console.log("[PlannerDashboard] Forecast data rows fetched:", data?.length || 0);
      
      if (!data || data.length === 0) {
        setPivotData([]);
        return;
      }

      // Get unique product IDs that have forecast data
      const uniqueProductIdsWithData = [...new Set(data.map((item: any) => item.product_id).filter(Boolean))];
      
      // Get subcategories only from products that have forecast data (filter happens here)
      const { data: productsWithData, error: productsError } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, subcategory_name')
        .in('product_id', uniqueProductIdsWithData)
        .eq('category_name', selectedCategory);
      
      if (productsError) throw productsError;
      
      // Get unique subcategories only from products with data
      const uniqueSubcategories = [...new Set(productsWithData?.map((p: any) => p.subcategory_name).filter(Boolean) || [])].sort();
      
      console.log("[PlannerDashboard] Products with forecast data:", uniqueProductIdsWithData.length);
      console.log("[PlannerDashboard] Unique subcategories with data:", uniqueSubcategories);
      
      // Create product to subcategory map from products with data
      const productToSubcategory = new Map<string, string>();
      productsWithData?.forEach((p: any) => {
        if (p.product_id && p.subcategory_name) {
          productToSubcategory.set(p.product_id, p.subcategory_name);
        }
      });
      
      // Enrich forecast data with subcategory
      const enrichedData = data.map((item: any) => ({
        ...item,
        subcategory_name: productToSubcategory.get(item.product_id) || 'Sin subcategoría',
      }));
      
      // Get all unique dates from forecast data
      const allDates = new Set<string>();
      enrichedData.forEach((item: any) => {
        if (item.postdate) {
          const dateStr = new Date(item.postdate).toISOString().split('T')[0];
          allDates.add(dateStr);
        }
      });
      
      const sortedDates = Array.from(allDates).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });

      // Aggregate data by subcategory and date for each series
      const rows: any[] = [];
      
      // First, calculate totals for the entire category (all subcategories combined)
      const categoryTotalSeriesData: { [key: string]: { [date: string]: number } } = {
        'Historia de ventas': {},
        'Forecast': {},
        'Plan inicial': {},
        'Demand Planner': {},
        'Ventas LY': {},
        'KAM input': {},
        'Historia ajustada': {},
      };

      // Aggregate all data for category totals
      enrichedData.forEach((item: any) => {
        const dateStr = new Date(item.postdate).toISOString().split('T')[0];
        
        // Historia de ventas (actual)
        if (item.actual) {
          categoryTotalSeriesData['Historia de ventas'][dateStr] = (categoryTotalSeriesData['Historia de ventas'][dateStr] || 0) + (item.actual || 0);
        }
        
        // Forecast
        if (item.forecast) {
          categoryTotalSeriesData['Forecast'][dateStr] = (categoryTotalSeriesData['Forecast'][dateStr] || 0) + (item.forecast || 0);
        }
        
        // Plan inicial (sales_plan)
        if (item.sales_plan) {
          categoryTotalSeriesData['Plan inicial'][dateStr] = (categoryTotalSeriesData['Plan inicial'][dateStr] || 0) + (item.sales_plan || 0);
        }
        
        // Demand Planner (use forecast as demand_planner may not be available)
        if (item.forecast) {
          categoryTotalSeriesData['Demand Planner'][dateStr] = (categoryTotalSeriesData['Demand Planner'][dateStr] || 0) + (item.forecast || 0);
        }
        
        // Ventas LY (forecast_ly)
        if (item.forecast_ly) {
          categoryTotalSeriesData['Ventas LY'][dateStr] = (categoryTotalSeriesData['Ventas LY'][dateStr] || 0) + (item.forecast_ly || 0);
        }
        
        // KAM input (commercial_input)
        if (item.commercial_input) {
          categoryTotalSeriesData['KAM input'][dateStr] = (categoryTotalSeriesData['KAM input'][dateStr] || 0) + (item.commercial_input || 0);
        }
        
        // Historia ajustada (use actual as fitted_history may not be available in forecast_data)
        if (item.actual) {
          categoryTotalSeriesData['Historia ajustada'][dateStr] = (categoryTotalSeriesData['Historia ajustada'][dateStr] || 0) + (item.actual || 0);
        }
      });

      // Add category total rows at the beginning
      Object.keys(categoryTotalSeriesData).forEach((seriesName) => {
        const row: any = {
          subcategory_name: 'Total Categoría',
          series: seriesName,
        };
        
        sortedDates.forEach((dateStr) => {
          row[dateStr] = categoryTotalSeriesData[seriesName][dateStr] || 0;
        });
        
        rows.push(row);
      });
      
      // Now add rows for each subcategory
      uniqueSubcategories.forEach((subcategoryName) => {
        // Filter data for this subcategory
        const subcategoryData = enrichedData.filter((item: any) => item.subcategory_name === subcategoryName);
        
        // Aggregate data by date for each series for this subcategory
        const seriesData: { [key: string]: { [date: string]: number } } = {
          'Historia de ventas': {},
          'Forecast': {},
          'Plan inicial': {},
          'Demand Planner': {},
          'Ventas LY': {},
          'KAM input': {},
          'Historia ajustada': {},
        };

        subcategoryData.forEach((item: any) => {
          const dateStr = new Date(item.postdate).toISOString().split('T')[0];
          
          // Historia de ventas (actual)
          if (item.actual) {
            seriesData['Historia de ventas'][dateStr] = (seriesData['Historia de ventas'][dateStr] || 0) + (item.actual || 0);
          }
          
          // Forecast
          if (item.forecast) {
            seriesData['Forecast'][dateStr] = (seriesData['Forecast'][dateStr] || 0) + (item.forecast || 0);
          }
          
          // Plan inicial (sales_plan)
          if (item.sales_plan) {
            seriesData['Plan inicial'][dateStr] = (seriesData['Plan inicial'][dateStr] || 0) + (item.sales_plan || 0);
          }
          
          // Demand Planner (use forecast as demand_planner may not be available)
          if (item.forecast) {
            seriesData['Demand Planner'][dateStr] = (seriesData['Demand Planner'][dateStr] || 0) + (item.forecast || 0);
          }
          
          // Ventas LY (forecast_ly)
          if (item.forecast_ly) {
            seriesData['Ventas LY'][dateStr] = (seriesData['Ventas LY'][dateStr] || 0) + (item.forecast_ly || 0);
          }
          
          // KAM input (commercial_input)
          if (item.commercial_input) {
            seriesData['KAM input'][dateStr] = (seriesData['KAM input'][dateStr] || 0) + (item.commercial_input || 0);
          }
          
          // Historia ajustada (use actual as fitted_history may not be available in forecast_data)
          if (item.actual) {
            seriesData['Historia ajustada'][dateStr] = (seriesData['Historia ajustada'][dateStr] || 0) + (item.actual || 0);
          }
        });

        // Convert to row format for this subcategory
        // No need to check hasData here since we already filtered at the database level
        Object.keys(seriesData).forEach((seriesName) => {
          const row: any = {
            subcategory_name: subcategoryName,
            series: seriesName,
          };
          
          sortedDates.forEach((dateStr) => {
            row[dateStr] = seriesData[seriesName][dateStr] || 0;
          });
          
          rows.push(row);
        });
      });

      setPivotData(rows);
      // Clear highlighted cells when data is refreshed
      setUpdatedCells(new Set());
    } catch (err: any) {
      console.error("[PlannerDashboard] Error fetching pivot data:", err);
      toast.error("Error cargando datos para pivot");
      setPivotData([]);
      setUpdatedCells(new Set());
    } finally {
      setLoadingPivot(false);
    }
  };

  const pivotColumnDefs: ColDef[] = useMemo(() => {
    if (!pivotData || pivotData.length === 0) {
      return [
        {
          field: "subcategory_name",
          headerName: "Subcategoría",
          rowGroup: true,
          pinned: "left",
          width: 200,
        },
        {
          field: "series",
          headerName: "Series",
          pinned: "left",
          width: 200,
        },
      ];
    }

    // Get unique dates from data keys (dates are stored as object keys, not in postdate field)
    const allDates = new Set<string>();
    pivotData.forEach((row: any) => {
      // Get all keys except 'series' and 'subcategory_name'
      Object.keys(row).forEach((key) => {
        if (key !== 'series' && key !== 'subcategory_name') {
          // Check if it's a date format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            allDates.add(key);
          }
        }
      });
    });
    
    const sortedDates = Array.from(allDates).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Create column definitions
    const columns: ColDef[] = [
      {
        field: "subcategory_name",
        headerName: "Subcategoría",
        rowGroup: true,
        hide: true, // Hide the original column since we'll show it as group
        pinned: "left",
        width: 200,
        showRowGroup: true,
      },
      {
        field: "series",
        headerName: "Series",
        pinned: "left",
        width: 200,
        cellStyle: { fontWeight: 'bold' },
        cellRenderer: (params: any) => {
          // Don't show anything for group rows (subcategory headers)
          if (params.node.group) {
            return '';
          }
          return params.data?.series || '';
        },
      },
    ];

    // Add date columns
    sortedDates.forEach((dateStr) => {
      // Format date for display (YYYY-MM-DD -> DD/MM/YYYY or keep as is)
      const dateObj = new Date(dateStr);
      const formattedHeader = dateStr; // Keep YYYY-MM-DD format or format as needed
      
      columns.push({
        field: dateStr,
        headerName: formattedHeader,
        width: 120,
        cellStyle: (params: any) => {
          const baseStyle: any = { textAlign: 'right' };
          const cellKey = `${params.data?.subcategory_name}-${params.data?.series}-${dateStr}`;
          if (updatedCells.has(cellKey)) {
            baseStyle.backgroundColor = '#fffacd'; // Light yellow highlight
            baseStyle.border = '2px solid #ffd700'; // Gold border
          }
          return baseStyle;
        },
        editable: (params: any) => {
          // Don't allow editing group rows
          if (params.node.group) return false;
          return params.data?.series === 'Demand Planner';
        },
        valueGetter: (params: any) => {
          // Don't show values for group rows
          if (params.node.group) return '';
          return params.data?.[dateStr] || 0;
        },
        valueFormatter: (params: any) => {
          // Don't show values for group rows
          if (params.node && params.node.group) return '';
          if (params.value === null || params.value === undefined || params.value === 0) return "";
          const numValue = Number(params.value);
          // Format with comma as thousands separator
          return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        valueSetter: (params: any) => {
          if (params.data?.series === 'Demand Planner') {
            // Update the value in the data
            params.data[params.colDef.field] = params.newValue || 0;
            return true;
          }
          return false;
        },
      });
    });

    return columns;
  }, [pivotData, updatedCells]);

  // Handle cell value changes for fair share distribution
  const handleCellValueChanged = (params: any) => {
    // Only process if it's a "Total Categoría" row and "Demand Planner" series
    if (params.data?.subcategory_name !== 'Total Categoría' || params.data?.series !== 'Demand Planner') {
      return;
    }

    const dateField = params.colDef.field;
    if (!dateField || !/^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
      return; // Not a date column
    }

    const oldValue = params.oldValue || 0;
    const newValue = params.newValue || 0;
    const difference = newValue - oldValue;

    if (difference === 0) {
      return; // No change
    }

    // Find all subcategories (excluding "Total Categoría") that have a value in this date
    const subcategoryRows = pivotData.filter((row: any) => 
      row.subcategory_name !== 'Total Categoría' && 
      row.series === 'Demand Planner' &&
      row[dateField] !== null && 
      row[dateField] !== undefined && 
      row[dateField] !== 0
    );

    if (subcategoryRows.length === 0) {
      return; // No subcategories with values to distribute
    }

    // Calculate total of current values for fair share distribution
    const totalCurrentValue = subcategoryRows.reduce((sum: number, row: any) => {
      return sum + (row[dateField] || 0);
    }, 0);

    // Track which cells will be updated
    const cellsToHighlight = new Set<string>();

    if (totalCurrentValue === 0) {
      // If all values are zero, distribute equally
      const equalShare = difference / subcategoryRows.length;
      // Round to ensure integer values
      const roundedEqualShare = Math.round(equalShare);
      // Calculate rounding error to adjust the last item
      let roundingError = difference - (roundedEqualShare * subcategoryRows.length);
      
      const updatedData = pivotData.map((row: any, index: number) => {
        if (row.subcategory_name !== 'Total Categoría' && 
            row.series === 'Demand Planner' &&
            row[dateField] !== null && 
            row[dateField] !== undefined) {
          const cellKey = `${row.subcategory_name}-${row.series}-${dateField}`;
          cellsToHighlight.add(cellKey);
          // Apply rounding error to the last item to ensure total matches
          const isLastItem = index === pivotData.length - 1 || 
            !pivotData.slice(index + 1).some((r: any) => 
              r.subcategory_name !== 'Total Categoría' && 
              r.series === 'Demand Planner' &&
              r[dateField] !== null && 
              r[dateField] !== undefined
            );
          const adjustment = isLastItem ? roundingError : 0;
          return {
            ...row,
            [dateField]: Math.round((row[dateField] || 0) + roundedEqualShare + adjustment)
          };
        }
        return row;
      });
      setPivotData(updatedData);
      // Update highlighted cells
      setUpdatedCells(prev => new Set([...prev, ...cellsToHighlight]));
      return;
    }

    // Calculate fair share proportionally
    let totalDistributed = 0;
    const shares: { row: any; share: number; cellKey: string }[] = [];
    
    pivotData.forEach((row: any) => {
      if (row.subcategory_name !== 'Total Categoría' && 
          row.series === 'Demand Planner' &&
          row[dateField] !== null && 
          row[dateField] !== undefined && 
          row[dateField] !== 0) {
        const currentValue = row[dateField] || 0;
        const proportion = currentValue / totalCurrentValue;
        const share = difference * proportion;
        const cellKey = `${row.subcategory_name}-${row.series}-${dateField}`;
        cellsToHighlight.add(cellKey);
        shares.push({ row, share, cellKey });
      }
    });

    // Round shares to integers
    const roundedShares = shares.map(({ share }) => Math.round(share));
    const roundingError = difference - roundedShares.reduce((sum, val) => sum + val, 0);
    
    // Adjust the largest share to compensate for rounding error
    if (roundingError !== 0 && shares.length > 0) {
      const largestIndex = roundedShares.reduce((maxIdx, val, idx, arr) => 
        val > arr[maxIdx] ? idx : maxIdx, 0
      );
      roundedShares[largestIndex] += roundingError;
    }

    // Apply rounded shares
    let shareIndex = 0;
    const updatedData = pivotData.map((row: any) => {
      if (row.subcategory_name !== 'Total Categoría' && 
          row.series === 'Demand Planner' &&
          row[dateField] !== null && 
          row[dateField] !== undefined && 
          row[dateField] !== 0) {
        const currentValue = row[dateField] || 0;
        const roundedShare = roundedShares[shareIndex++];
        return {
          ...row,
          [dateField]: Math.round(currentValue + roundedShare)
        };
      }
      return row;
    });

    setPivotData(updatedData);
    // Update highlighted cells
    setUpdatedCells(prev => new Set([...prev, ...cellsToHighlight]));
  };

  return (
    <main className="p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Planner Dashboard</h1>
      </header>
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <div className={agGridContainerStyles}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              loading={loading}
              loadingOverlayComponentParams={{ loadingMessage: "Cargando..." }}
              theme={myTheme}
              animateRows={commonAgGridConfig.animateRows}
              headerHeight={commonAgGridConfig.headerHeight}
              rowHeight={commonAgGridConfig.rowHeight}
              pagination={defaultGridOptions.pagination}
              paginationPageSize={defaultGridOptions.paginationPageSize}
              suppressMenuHide={defaultGridOptions.suppressMenuHide}
              enableCellTextSelection={defaultGridOptions.enableCellTextSelection}
              ensureDomOrder={defaultGridOptions.ensureDomOrder}
              rowSelection="single"
              suppressRowClickSelection={false}
              enableRangeSelection={defaultGridOptions.enableRangeSelection}
              suppressCopyRowsToClipboard={defaultGridOptions.suppressCopyRowsToClipboard}
              enableCharts={defaultGridOptions.enableCharts}
              enableRangeHandle={defaultGridOptions.enableRangeHandle}
              enableFillHandle={defaultGridOptions.enableFillHandle}
              getRowClass={defaultGridOptions.getRowClass}
              defaultColDef={{
                ...defaultGridOptions.defaultColDef,
                ...commonAgGridConfig.defaultColDef,
              }}
              onCellFocused={defaultGridOptions.onCellFocused}
              onSelectionChanged={handleCategorySelection}
              onRowClicked={handleRowClicked}
              statusBar={defaultGridOptions.statusBar}
            />
          </div>
          {loading && <div className="mt-2 text-sm text-muted-foreground">Cargando datos...</div>}
          {!loading && rowData.length === 0 && (
            <div className="mt-2 text-sm text-muted-foreground">No hay datos para mostrar.</div>
          )}
        </div>
        <div>
          <div className={agGridContainerStyles}>
            <AgGridReact
              rowData={subcategoryData}
              columnDefs={subcategoryColumnDefs}
              loading={loadingSubcategories}
              loadingOverlayComponentParams={{ loadingMessage: "Cargando..." }}
              theme={myTheme}
              animateRows={commonAgGridConfig.animateRows}
              headerHeight={commonAgGridConfig.headerHeight}
              rowHeight={commonAgGridConfig.rowHeight}
              pagination={defaultGridOptions.pagination}
              paginationPageSize={defaultGridOptions.paginationPageSize}
              suppressMenuHide={defaultGridOptions.suppressMenuHide}
              enableCellTextSelection={defaultGridOptions.enableCellTextSelection}
              ensureDomOrder={defaultGridOptions.ensureDomOrder}
              rowSelection="single"
              suppressRowClickSelection={false}
              enableRangeSelection={defaultGridOptions.enableRangeSelection}
              suppressCopyRowsToClipboard={defaultGridOptions.suppressCopyRowsToClipboard}
              enableCharts={defaultGridOptions.enableCharts}
              enableRangeHandle={defaultGridOptions.enableRangeHandle}
              enableFillHandle={defaultGridOptions.enableFillHandle}
              getRowClass={defaultGridOptions.getRowClass}
              defaultColDef={{
                ...defaultGridOptions.defaultColDef,
                ...commonAgGridConfig.defaultColDef,
              }}
              onCellFocused={defaultGridOptions.onCellFocused}
              onSelectionChanged={handleSubcategorySelection}
              onRowClicked={handleSubcategoryRowClicked}
              statusBar={defaultGridOptions.statusBar}
            />
          </div>
        </div>
        <div>
          <div className={agGridContainerStyles}>
            <AgGridReact
              rowData={classesData}
              columnDefs={classesColumnDefs}
              loading={loadingClasses}
              loadingOverlayComponentParams={{ loadingMessage: "Cargando..." }}
              theme={myTheme}
              animateRows={commonAgGridConfig.animateRows}
              headerHeight={commonAgGridConfig.headerHeight}
              rowHeight={commonAgGridConfig.rowHeight}
              pagination={defaultGridOptions.pagination}
              paginationPageSize={defaultGridOptions.paginationPageSize}
              suppressMenuHide={defaultGridOptions.suppressMenuHide}
              enableCellTextSelection={defaultGridOptions.enableCellTextSelection}
              ensureDomOrder={defaultGridOptions.ensureDomOrder}
              rowSelection="single"
              suppressRowClickSelection={false}
              enableRangeSelection={defaultGridOptions.enableRangeSelection}
              suppressCopyRowsToClipboard={defaultGridOptions.suppressCopyRowsToClipboard}
              enableCharts={defaultGridOptions.enableCharts}
              enableRangeHandle={defaultGridOptions.enableRangeHandle}
              enableFillHandle={defaultGridOptions.enableFillHandle}
              getRowClass={defaultGridOptions.getRowClass}
              defaultColDef={{
                ...defaultGridOptions.defaultColDef,
                ...commonAgGridConfig.defaultColDef,
              }}
              onCellFocused={defaultGridOptions.onCellFocused}
              onSelectionChanged={handleSubcategoryChildSelection}
              onRowClicked={handleSubcategoryChildRowClicked}
              statusBar={defaultGridOptions.statusBar}
            />
          </div>
          {loadingClasses && <div className="mt-2 text-sm text-muted-foreground">Cargando datos...</div>}
        </div>
        <div>
          <div className={agGridContainerStyles}>
            <AgGridReact
              rowData={classItemsData}
              columnDefs={classItemsColumnDefs}
              loading={loadingClassItems}
              loadingOverlayComponentParams={{ loadingMessage: "Cargando..." }}
              theme={myTheme}
              animateRows={commonAgGridConfig.animateRows}
              headerHeight={commonAgGridConfig.headerHeight}
              rowHeight={commonAgGridConfig.rowHeight}
              pagination={defaultGridOptions.pagination}
              paginationPageSize={defaultGridOptions.paginationPageSize}
              suppressMenuHide={defaultGridOptions.suppressMenuHide}
              enableCellTextSelection={defaultGridOptions.enableCellTextSelection}
              ensureDomOrder={defaultGridOptions.ensureDomOrder}
              rowSelection="single"
              suppressRowClickSelection={false}
              enableRangeSelection={defaultGridOptions.enableRangeSelection}
              suppressCopyRowsToClipboard={defaultGridOptions.suppressCopyRowsToClipboard}
              enableCharts={defaultGridOptions.enableCharts}
              enableRangeHandle={defaultGridOptions.enableRangeHandle}
              enableFillHandle={defaultGridOptions.enableFillHandle}
              getRowClass={defaultGridOptions.getRowClass}
              defaultColDef={{
                ...defaultGridOptions.defaultColDef,
                ...commonAgGridConfig.defaultColDef,
              }}
              onCellFocused={defaultGridOptions.onCellFocused}
              onSelectionChanged={handleClassSelection}
              onRowClicked={handleClassRowClicked}
              statusBar={defaultGridOptions.statusBar}
            />
          </div>
          {loadingClassItems && <div className="mt-2 text-sm text-muted-foreground">Cargando datos...</div>}
          {!loadingClassItems && !selectedSubcategoryChild && (
            <div className="mt-2 text-sm text-muted-foreground">Seleccione una subcategoría child para ver las clases.</div>
          )}
          {!loadingClassItems && selectedSubcategoryChild && classItemsData.length === 0 && (
            <div className="mt-2 text-sm text-muted-foreground">No hay clases para mostrar.</div>
          )}
        </div>
      </section>
      <section className="mt-4">
        <div>
            <div className={agGridContainerStyles}>
              {loadingChart ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">Cargando datos del gráfico...</div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">
                    {!selectedCategory 
                      ? "Seleccione una categoría para ver el gráfico." 
                      : "No hay datos para mostrar."}
                  </div>
                </div>
              ) : (
                <ChartComponent data={chartData} />
              )}
            </div>
            {loadingChart && <div className="mt-2 text-sm text-muted-foreground">Cargando datos...</div>}
        </div>
      </section>
      
      <section className="mt-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Forecast Validation Test (Pivot)</h2>
          <div className={agGridContainerStyles}>
            <AgGridReact
              rowData={pivotData}
              columnDefs={pivotColumnDefs}
              loading={loadingPivot}
              loadingOverlayComponentParams={{ loadingMessage: "Cargando..." }}
              theme={myTheme}
              animateRows={commonAgGridConfig.animateRows}
              headerHeight={commonAgGridConfig.headerHeight}
              rowHeight={commonAgGridConfig.rowHeight}
              pagination={false}
              suppressMenuHide={defaultGridOptions.suppressMenuHide}
              enableCellTextSelection={defaultGridOptions.enableCellTextSelection}
              ensureDomOrder={defaultGridOptions.ensureDomOrder}
              rowSelection={defaultGridOptions.rowSelection}
              suppressRowClickSelection={defaultGridOptions.suppressRowClickSelection}
              enableRangeSelection={defaultGridOptions.enableRangeSelection}
              suppressCopyRowsToClipboard={defaultGridOptions.suppressCopyRowsToClipboard}
              enableCharts={defaultGridOptions.enableCharts}
              enableRangeHandle={defaultGridOptions.enableRangeHandle}
              enableFillHandle={defaultGridOptions.enableFillHandle}
              getRowClass={defaultGridOptions.getRowClass}
              getRowStyle={(params: any) => {
                if (params.data?.series === 'Forecast') {
                  return { backgroundColor: '#fff8e3' };
                }
                if (params.data?.series === 'Historia de ventas') {
                  return { backgroundColor: '#ebfce1' };
                }
                if (params.data?.series === 'Plan inicial') {
                  return { backgroundColor: '#cfe0fa' };
                }
                if (params.data?.series === 'Demand Planner') {
                  return { backgroundColor: '#ffd4eb' };
                }
                if (params.data?.series === 'Ventas LY') {
                  return { backgroundColor: '#e8e8e8' };
                }
                if (params.data?.series === 'KAM input') {
                  return { backgroundColor: '#e8e8e8' };
                }
                if (params.data?.series === 'Historia ajustada') {
                  return { backgroundColor: '#e8e8e8' };
                }
                return null;
              }}
              defaultColDef={{
                ...defaultGridOptions.defaultColDef,
                ...commonAgGridConfig.defaultColDef,
              }}
              onCellFocused={defaultGridOptions.onCellFocused}
              onCellValueChanged={handleCellValueChanged}
              statusBar={defaultGridOptions.statusBar}
              groupDefaultExpanded={-1} // Expand all groups by default
              groupDisplayType="groupRows"
              suppressAggFuncInHeader={true}
              autoGroupColumnDef={{
                headerName: "Subcategoría",
                pinned: "left",
                width: 200,
                cellRendererParams: {
                  suppressCount: true, // Don't show count in group header
                  innerRenderer: (params: any) => {
                    return params.value || 'Sin subcategoría';
                  }
                }
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default PlannerDashboard;

