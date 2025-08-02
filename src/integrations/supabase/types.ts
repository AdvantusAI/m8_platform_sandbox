export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_recommendations: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          confidence_score: number | null
          context_data: Json | null
          created_at: string | null
          customer_id: string | null
          description: string
          expected_impact: string | null
          id: string
          location_id: string
          priority: string | null
          product_id: string
          reasoning: string | null
          recommendation_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggested_action: Json | null
          title: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string | null
          customer_id?: string | null
          description: string
          expected_impact?: string | null
          id?: string
          location_id: string
          priority?: string | null
          product_id: string
          reasoning?: string | null
          recommendation_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_action?: Json | null
          title: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string | null
          customer_id?: string | null
          description?: string
          expected_impact?: string | null
          id?: string
          location_id?: string
          priority?: string | null
          product_id?: string
          reasoning?: string | null
          recommendation_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_action?: Json | null
          title?: string
        }
        Relationships: []
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      annotation_layer: {
        Row: {
          changed_by_fk: number | null
          changed_on: string | null
          created_by_fk: number | null
          created_on: string | null
          descr: string | null
          id: number
          name: string | null
        }
        Insert: {
          changed_by_fk?: number | null
          changed_on?: string | null
          created_by_fk?: number | null
          created_on?: string | null
          descr?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          changed_by_fk?: number | null
          changed_on?: string | null
          created_by_fk?: number | null
          created_on?: string | null
          descr?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          active: boolean | null
          code: string
          company_id: number | null
          created_at: string | null
          email: string | null
          id: number
          name: string
        }
        Insert: {
          active?: boolean | null
          code: string
          company_id?: number | null
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
        }
        Update: {
          active?: boolean | null
          code?: string
          company_id?: number | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_partners: {
        Row: {
          contact_information: Json | null
          country: string | null
          created_at: string | null
          id: string
          partner_code: string
          partner_name: string
          partner_type: string
          performance_metrics: Json | null
          region: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contact_information?: Json | null
          country?: string | null
          created_at?: string | null
          id?: string
          partner_code: string
          partner_name: string
          partner_type: string
          performance_metrics?: Json | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_information?: Json | null
          country?: string | null
          created_at?: string | null
          id?: string
          partner_code?: string
          partner_name?: string
          partner_type?: string
          performance_metrics?: Json | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          context_filters: Json | null
          conversation_title: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_filters?: Json | null
          conversation_title?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_filters?: Json | null
          conversation_title?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_workflows: {
        Row: {
          assigned_commercial: string | null
          assigned_planner: string | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          location_id: string
          priority: string | null
          product_id: string
          status: string | null
          updated_at: string | null
          workflow_name: string
          workflow_type: string
        }
        Insert: {
          assigned_commercial?: string | null
          assigned_planner?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          location_id: string
          priority?: string | null
          product_id: string
          status?: string | null
          updated_at?: string | null
          workflow_name: string
          workflow_type: string
        }
        Update: {
          assigned_commercial?: string | null
          assigned_planner?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          location_id?: string
          priority?: string | null
          product_id?: string
          status?: string | null
          updated_at?: string | null
          workflow_name?: string
          workflow_type?: string
        }
        Relationships: []
      }
      commercial_team_profiles: {
        Row: {
          created_at: string | null
          customer_segments: string[] | null
          id: string
          manager_level: string | null
          phone: string | null
          region: string | null
          specialization: string | null
          territory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_segments?: string[] | null
          id?: string
          manager_level?: string | null
          phone?: string | null
          region?: string | null
          specialization?: string | null
          territory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_segments?: string[] | null
          id?: string
          manager_level?: string | null
          phone?: string | null
          region?: string | null
          specialization?: string | null
          territory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          capital_cost_rate: number | null
          carrying_cost_rate: number | null
          created_at: string | null
          id: number
          name: string
          order_header_cost: number | null
          order_line_cost: number | null
          service_level_default: number | null
        }
        Insert: {
          capital_cost_rate?: number | null
          carrying_cost_rate?: number | null
          created_at?: string | null
          id?: number
          name: string
          order_header_cost?: number | null
          order_line_cost?: number | null
          service_level_default?: number | null
        }
        Update: {
          capital_cost_rate?: number | null
          carrying_cost_rate?: number | null
          created_at?: string | null
          id?: number
          name?: string
          order_header_cost?: number | null
          order_line_cost?: number | null
          service_level_default?: number | null
        }
        Relationships: []
      }
      company_config: {
        Row: {
          company_logo: string | null
          company_name: string | null
          id: number
          planning_buckets: string | null
        }
        Insert: {
          company_logo?: string | null
          company_name?: string | null
          id?: number
          planning_buckets?: string | null
        }
        Update: {
          company_logo?: string | null
          company_name?: string | null
          id?: number
          planning_buckets?: string | null
        }
        Relationships: []
      }
      current_inventory: {
        Row: {
          available_stock: number | null
          committed_stock: number
          created_at: string | null
          current_stock: number
          economic_order_quantity: number
          holding_cost_rate: number
          inventory_id: string
          last_count_date: string | null
          last_updated: string | null
          lead_time_days: number
          max_stock: number
          min_stock: number
          product_id: string
          reorder_point: number
          safety_stock: number
          stockout_cost_per_unit: number
          unit_cost: number
          updated_at: string | null
          warehouse_id: number
        }
        Insert: {
          available_stock?: number | null
          committed_stock?: number
          created_at?: string | null
          current_stock?: number
          economic_order_quantity?: number
          holding_cost_rate?: number
          inventory_id?: string
          last_count_date?: string | null
          last_updated?: string | null
          lead_time_days?: number
          max_stock?: number
          min_stock?: number
          product_id: string
          reorder_point?: number
          safety_stock?: number
          stockout_cost_per_unit?: number
          unit_cost?: number
          updated_at?: string | null
          warehouse_id: number
        }
        Update: {
          available_stock?: number | null
          committed_stock?: number
          created_at?: string | null
          current_stock?: number
          economic_order_quantity?: number
          holding_cost_rate?: number
          inventory_id?: string
          last_count_date?: string | null
          last_updated?: string | null
          lead_time_days?: number
          max_stock?: number
          min_stock?: number
          product_id?: string
          reorder_point?: number
          safety_stock?: number
          stockout_cost_per_unit?: number
          unit_cost?: number
          updated_at?: string | null
          warehouse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "current_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "current_inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_assignments: {
        Row: {
          assignment_type: string | null
          commercial_user_id: string
          created_at: string | null
          customer_id: string
          end_date: string | null
          id: string
          start_date: string | null
        }
        Insert: {
          assignment_type?: string | null
          commercial_user_id: string
          created_at?: string | null
          customer_id: string
          end_date?: string | null
          id?: string
          start_date?: string | null
        }
        Update: {
          assignment_type?: string | null
          commercial_user_id?: string
          created_at?: string | null
          customer_id?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_logo: string | null
          customer_name: string | null
          id: string
          level_1: string | null
          level_1_name: string | null
          level_2: string | null
          level_2_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_logo?: string | null
          customer_name?: string | null
          id?: string
          level_1?: string | null
          level_1_name?: string | null
          level_2?: string | null
          level_2_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_logo?: string | null
          customer_name?: string | null
          id?: string
          level_1?: string | null
          level_1_name?: string | null
          level_2?: string | null
          level_2_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      demand_events: {
        Row: {
          actual_impact: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          end_date: string
          event_name: string
          event_subtype: string | null
          event_type: string
          expected_impact_max: number | null
          expected_impact_min: number | null
          id: number
          impact_direction: string | null
          location_id: string | null
          metadata: Json | null
          product_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          actual_impact?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date: string
          event_name: string
          event_subtype?: string | null
          event_type: string
          expected_impact_max?: number | null
          expected_impact_min?: number | null
          id?: number
          impact_direction?: string | null
          location_id?: string | null
          metadata?: Json | null
          product_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          actual_impact?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string
          event_name?: string
          event_subtype?: string | null
          event_type?: string
          expected_impact_max?: number | null
          expected_impact_min?: number | null
          id?: number
          impact_direction?: string | null
          location_id?: string | null
          metadata?: Json | null
          product_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      demand_forecasts: {
        Row: {
          created_at: string | null
          forecast_method: string | null
          forecast_period: string
          freeze_until: string | null
          id: number
          madp: number | null
          monthly_forecast: number | null
          product_id: string | null
          quarterly_forecast: number | null
          seasonal_profile_id: number | null
          track: number | null
          updated_at: string | null
          warehouse_id: number | null
          weekly_forecast: number | null
          yearly_forecast: number | null
        }
        Insert: {
          created_at?: string | null
          forecast_method?: string | null
          forecast_period: string
          freeze_until?: string | null
          id?: number
          madp?: number | null
          monthly_forecast?: number | null
          product_id?: string | null
          quarterly_forecast?: number | null
          seasonal_profile_id?: number | null
          track?: number | null
          updated_at?: string | null
          warehouse_id?: number | null
          weekly_forecast?: number | null
          yearly_forecast?: number | null
        }
        Update: {
          created_at?: string | null
          forecast_method?: string | null
          forecast_period?: string
          freeze_until?: string | null
          id?: number
          madp?: number | null
          monthly_forecast?: number | null
          product_id?: string | null
          quarterly_forecast?: number | null
          seasonal_profile_id?: number | null
          track?: number | null
          updated_at?: string | null
          warehouse_id?: number | null
          weekly_forecast?: number | null
          yearly_forecast?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_history: {
        Row: {
          created_at: string | null
          id: number
          lost_sales: number | null
          period_date: string
          product_id: string | null
          promotional_demand: number | null
          shipped_quantity: number | null
          total_demand: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          lost_sales?: number | null
          period_date: string
          product_id?: string | null
          promotional_demand?: number | null
          shipped_quantity?: number | null
          total_demand?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          lost_sales?: number | null
          period_date?: string
          product_id?: string | null
          promotional_demand?: number | null
          shipped_quantity?: number | null
          total_demand?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_outliers: {
        Row: {
          avg_deviation: number | null
          capped_value: number
          created_at: string | null
          customer_id: string
          demand_outliers: number | null
          detection_method: string
          expected_value: number | null
          explanation: string | null
          id: number
          location_id: string | null
          original_value: number
          postdate: string
          product_id: string
          score: number | null
          severity: string | null
          vendor_id: string | null
        }
        Insert: {
          avg_deviation?: number | null
          capped_value: number
          created_at?: string | null
          customer_id?: string
          demand_outliers?: number | null
          detection_method?: string
          expected_value?: number | null
          explanation?: string | null
          id?: number
          location_id?: string | null
          original_value: number
          postdate: string
          product_id: string
          score?: number | null
          severity?: string | null
          vendor_id?: string | null
        }
        Update: {
          avg_deviation?: number | null
          capped_value?: number
          created_at?: string | null
          customer_id?: string
          demand_outliers?: number | null
          detection_method?: string
          expected_value?: number | null
          explanation?: string | null
          id?: number
          location_id?: string | null
          original_value?: number
          postdate?: string
          product_id?: string
          score?: number | null
          severity?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      embedded_dashboards: {
        Row: {
          allow_domain_list: string | null
          changed_by_fk: number | null
          changed_on: string | null
          created_by_fk: number | null
          created_on: string | null
          dashboard_id: number
          uuid: string | null
        }
        Insert: {
          allow_domain_list?: string | null
          changed_by_fk?: number | null
          changed_on?: string | null
          created_by_fk?: number | null
          created_on?: string | null
          dashboard_id: number
          uuid?: string | null
        }
        Update: {
          allow_domain_list?: string | null
          changed_by_fk?: number | null
          changed_on?: string | null
          created_by_fk?: number | null
          created_on?: string | null
          dashboard_id?: number
          uuid?: string | null
        }
        Relationships: []
      }
      event_impact_analysis: {
        Row: {
          actual_demand: number | null
          analysis_date: string | null
          baseline_demand: number | null
          confidence_score: number | null
          created_at: string | null
          customer_id: string | null
          event_id: number | null
          id: number
          impact_multiplier: number | null
          is_significant: boolean | null
          location_id: string | null
          notes: string | null
          product_id: string | null
        }
        Insert: {
          actual_demand?: number | null
          analysis_date?: string | null
          baseline_demand?: number | null
          confidence_score?: number | null
          created_at?: string | null
          customer_id?: string | null
          event_id?: number | null
          id?: number
          impact_multiplier?: number | null
          is_significant?: boolean | null
          location_id?: string | null
          notes?: string | null
          product_id?: string | null
        }
        Update: {
          actual_demand?: number | null
          analysis_date?: string | null
          baseline_demand?: number | null
          confidence_score?: number | null
          created_at?: string | null
          customer_id?: string | null
          event_id?: number | null
          id?: number
          impact_multiplier?: number | null
          is_significant?: boolean | null
          location_id?: string | null
          notes?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_impact_analysis_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "demand_events"
            referencedColumns: ["id"]
          },
        ]
      }
      exogenous_variables: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          customer_id: string | null
          date_effective: string
          id: string
          impact_coefficient: number | null
          location_id: string | null
          metadata: Json | null
          product_id: string | null
          updated_at: string | null
          variable_category: string | null
          variable_name: string
          variable_type: string
          variable_value: number | null
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          customer_id?: string | null
          date_effective: string
          id?: string
          impact_coefficient?: number | null
          location_id?: string | null
          metadata?: Json | null
          product_id?: string | null
          updated_at?: string | null
          variable_category?: string | null
          variable_name: string
          variable_type: string
          variable_value?: number | null
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          customer_id?: string | null
          date_effective?: string
          id?: string
          impact_coefficient?: number | null
          location_id?: string | null
          metadata?: Json | null
          product_id?: string | null
          updated_at?: string | null
          variable_category?: string | null
          variable_name?: string
          variable_type?: string
          variable_value?: number | null
        }
        Relationships: []
      }
      feature_importance: {
        Row: {
          created_at: string | null
          customer_id: string | null
          feature_category: string | null
          feature_name: string
          forecast_run_id: string | null
          id: number
          importance_percentage: number
          importance_rank: number | null
          importance_value: number
          location_id: string
          model_name: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          feature_category?: string | null
          feature_name: string
          forecast_run_id?: string | null
          id?: number
          importance_percentage: number
          importance_rank?: number | null
          importance_value: number
          location_id: string
          model_name: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          feature_category?: string | null
          feature_name?: string
          forecast_run_id?: string | null
          id?: number
          importance_percentage?: number
          importance_rank?: number | null
          importance_value?: number
          location_id?: string
          model_name?: string
          product_id?: string
        }
        Relationships: []
      }
      forecast_collaboration_comments: {
        Row: {
          comment_text: string
          comment_type: string | null
          created_at: string | null
          forecast_data_id: string
          id: string
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          comment_type?: string | null
          created_at?: string | null
          forecast_data_id: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          comment_type?: string | null
          created_at?: string | null
          forecast_data_id?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_collaboration_comments_forecast_data_id_fkey"
            columns: ["forecast_data_id"]
            isOneToOne: false
            referencedRelation: "forecast_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_collaboration_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "forecast_collaboration_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_data: {
        Row: {
          actual: number | null
          channel_partner_id: string | null
          collaboration_status: string | null
          commercial_confidence: string | null
          commercial_input: number | null
          commercial_notes: string | null
          commercial_reviewed_at: string | null
          commercial_reviewed_by: string | null
          competitive_impact: string | null
          competitor_promo_activity: string | null
          created_at: string
          customer_id: string | null
          data_driven_events: number | null
          day_of_week: number | null
          demand_planner: number | null
          exogenous_variables_impact: Json | null
          forecast: number | null
          forecast_ly: number | null
          forecast_reconciliation_id: string | null
          holiday_type: string | null
          id: string
          inventory: number | null
          is_holiday: boolean | null
          is_npi_forecast: boolean | null
          location_id: string | null
          lower_bound: number | null
          market_intelligence: string | null
          npi_product_id: string | null
          npi_scenario_type: string | null
          postdate: string
          precipitation_mm: number | null
          product_id: string | null
          promotion_duration: number | null
          promotion_intensity: number | null
          promotional_activity: string | null
          sales_plan: number | null
          sell_in_forecast: number | null
          sell_out_forecast: number | null
          temperature_avg: number | null
          updated_at: string | null
          upper_bound: number | null
          weather_category: string | null
          week_of_month: number | null
        }
        Insert: {
          actual?: number | null
          channel_partner_id?: string | null
          collaboration_status?: string | null
          commercial_confidence?: string | null
          commercial_input?: number | null
          commercial_notes?: string | null
          commercial_reviewed_at?: string | null
          commercial_reviewed_by?: string | null
          competitive_impact?: string | null
          competitor_promo_activity?: string | null
          created_at?: string
          customer_id?: string | null
          data_driven_events?: number | null
          day_of_week?: number | null
          demand_planner?: number | null
          exogenous_variables_impact?: Json | null
          forecast?: number | null
          forecast_ly?: number | null
          forecast_reconciliation_id?: string | null
          holiday_type?: string | null
          id?: string
          inventory?: number | null
          is_holiday?: boolean | null
          is_npi_forecast?: boolean | null
          location_id?: string | null
          lower_bound?: number | null
          market_intelligence?: string | null
          npi_product_id?: string | null
          npi_scenario_type?: string | null
          postdate: string
          precipitation_mm?: number | null
          product_id?: string | null
          promotion_duration?: number | null
          promotion_intensity?: number | null
          promotional_activity?: string | null
          sales_plan?: number | null
          sell_in_forecast?: number | null
          sell_out_forecast?: number | null
          temperature_avg?: number | null
          updated_at?: string | null
          upper_bound?: number | null
          weather_category?: string | null
          week_of_month?: number | null
        }
        Update: {
          actual?: number | null
          channel_partner_id?: string | null
          collaboration_status?: string | null
          commercial_confidence?: string | null
          commercial_input?: number | null
          commercial_notes?: string | null
          commercial_reviewed_at?: string | null
          commercial_reviewed_by?: string | null
          competitive_impact?: string | null
          competitor_promo_activity?: string | null
          created_at?: string
          customer_id?: string | null
          data_driven_events?: number | null
          day_of_week?: number | null
          demand_planner?: number | null
          exogenous_variables_impact?: Json | null
          forecast?: number | null
          forecast_ly?: number | null
          forecast_reconciliation_id?: string | null
          holiday_type?: string | null
          id?: string
          inventory?: number | null
          is_holiday?: boolean | null
          is_npi_forecast?: boolean | null
          location_id?: string | null
          lower_bound?: number | null
          market_intelligence?: string | null
          npi_product_id?: string | null
          npi_scenario_type?: string | null
          postdate?: string
          precipitation_mm?: number | null
          product_id?: string | null
          promotion_duration?: number | null
          promotion_intensity?: number | null
          promotional_activity?: string | null
          sales_plan?: number | null
          sell_in_forecast?: number | null
          sell_out_forecast?: number | null
          temperature_avg?: number | null
          updated_at?: string | null
          upper_bound?: number | null
          weather_category?: string | null
          week_of_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_data_channel_partner_id_fkey"
            columns: ["channel_partner_id"]
            isOneToOne: false
            referencedRelation: "channel_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_data_forecast_reconciliation_id_fkey"
            columns: ["forecast_reconciliation_id"]
            isOneToOne: false
            referencedRelation: "forecast_reconciliation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_data_npi_product_id_fkey"
            columns: ["npi_product_id"]
            isOneToOne: false
            referencedRelation: "npi_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      forecast_error_metrics: {
        Row: {
          business_acceptability: boolean | null
          coverage_deviation: number | null
          coverage_probability: number | null
          created_at: string | null
          customer_id: string
          cv: number | null
          data_points: number | null
          data_points_used: number | null
          evaluation_period_end: string | null
          evaluation_period_start: string | null
          forecast_accuracy_category: string | null
          forecast_bias: number | null
          forecast_period_end: string | null
          forecast_period_start: string | null
          forecast_run_id: string | null
          id: number
          interval_score: number | null
          location_id: string | null
          mae: number | null
          mape: number | null
          mean_demand: number | null
          mean_interval_width: number | null
          model_convergence: boolean | null
          model_name: string
          mse: number | null
          prediction_time_seconds: number | null
          product_id: string
          relative_interval_width: number | null
          rmse: number | null
          safe_mape: number | null
          seasonality_strength: number | null
          segment_name: string | null
          smape: number | null
          std_demand: number | null
          target_coverage: number | null
          training_time_seconds: number | null
          trend_strength: number | null
          uncertainty_quality_score: number | null
          volatility_coefficient: number | null
          wmape: number | null
          zero_frequency: number | null
        }
        Insert: {
          business_acceptability?: boolean | null
          coverage_deviation?: number | null
          coverage_probability?: number | null
          created_at?: string | null
          customer_id?: string
          cv?: number | null
          data_points?: number | null
          data_points_used?: number | null
          evaluation_period_end?: string | null
          evaluation_period_start?: string | null
          forecast_accuracy_category?: string | null
          forecast_bias?: number | null
          forecast_period_end?: string | null
          forecast_period_start?: string | null
          forecast_run_id?: string | null
          id?: number
          interval_score?: number | null
          location_id?: string | null
          mae?: number | null
          mape?: number | null
          mean_demand?: number | null
          mean_interval_width?: number | null
          model_convergence?: boolean | null
          model_name: string
          mse?: number | null
          prediction_time_seconds?: number | null
          product_id: string
          relative_interval_width?: number | null
          rmse?: number | null
          safe_mape?: number | null
          seasonality_strength?: number | null
          segment_name?: string | null
          smape?: number | null
          std_demand?: number | null
          target_coverage?: number | null
          training_time_seconds?: number | null
          trend_strength?: number | null
          uncertainty_quality_score?: number | null
          volatility_coefficient?: number | null
          wmape?: number | null
          zero_frequency?: number | null
        }
        Update: {
          business_acceptability?: boolean | null
          coverage_deviation?: number | null
          coverage_probability?: number | null
          created_at?: string | null
          customer_id?: string
          cv?: number | null
          data_points?: number | null
          data_points_used?: number | null
          evaluation_period_end?: string | null
          evaluation_period_start?: string | null
          forecast_accuracy_category?: string | null
          forecast_bias?: number | null
          forecast_period_end?: string | null
          forecast_period_start?: string | null
          forecast_run_id?: string | null
          id?: number
          interval_score?: number | null
          location_id?: string | null
          mae?: number | null
          mape?: number | null
          mean_demand?: number | null
          mean_interval_width?: number | null
          model_convergence?: boolean | null
          model_name?: string
          mse?: number | null
          prediction_time_seconds?: number | null
          product_id?: string
          relative_interval_width?: number | null
          rmse?: number | null
          safe_mape?: number | null
          seasonality_strength?: number | null
          segment_name?: string | null
          smape?: number | null
          std_demand?: number | null
          target_coverage?: number | null
          training_time_seconds?: number | null
          trend_strength?: number | null
          uncertainty_quality_score?: number | null
          volatility_coefficient?: number | null
          wmape?: number | null
          zero_frequency?: number | null
        }
        Relationships: []
      }
      forecast_interpretability: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          customer_id: string
          data_pattern_type: string | null
          forecast_error_id: number | null
          forecast_explanation: string | null
          forecast_run_id: string | null
          id: number
          interpretability_score: number | null
          inventory_recommendations: string | null
          location_id: string | null
          model_complexity: string | null
          model_name: string
          model_selection_reason: string | null
          planning_horizon_days: number | null
          primary_drivers: string[] | null
          product_id: string
          recommended_actions: string[] | null
          risk_factors: string[] | null
          segment_classification: string | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          customer_id?: string
          data_pattern_type?: string | null
          forecast_error_id?: number | null
          forecast_explanation?: string | null
          forecast_run_id?: string | null
          id?: number
          interpretability_score?: number | null
          inventory_recommendations?: string | null
          location_id?: string | null
          model_complexity?: string | null
          model_name: string
          model_selection_reason?: string | null
          planning_horizon_days?: number | null
          primary_drivers?: string[] | null
          product_id: string
          recommended_actions?: string[] | null
          risk_factors?: string[] | null
          segment_classification?: string | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          customer_id?: string
          data_pattern_type?: string | null
          forecast_error_id?: number | null
          forecast_explanation?: string | null
          forecast_run_id?: string | null
          id?: number
          interpretability_score?: number | null
          inventory_recommendations?: string | null
          location_id?: string | null
          model_complexity?: string | null
          model_name?: string
          model_selection_reason?: string | null
          planning_horizon_days?: number | null
          primary_drivers?: string[] | null
          product_id?: string
          recommended_actions?: string[] | null
          risk_factors?: string[] | null
          segment_classification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_interpretability_forecast_error_id_fkey"
            columns: ["forecast_error_id"]
            isOneToOne: false
            referencedRelation: "forecast_error_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_lag_analysis: {
        Row: {
          absolute_error: number | null
          actual_value: number | null
          analysis_date: string
          created_at: string | null
          customer_id: string | null
          forecast_accuracy_category: string | null
          forecast_creation_date: string | null
          forecast_target_date: string | null
          forecast_value: number | null
          id: number
          lag_days: number | null
          location_id: string
          mae: number | null
          mape: number | null
          percentage_error: number | null
          planning_bucket: string
          product_id: string
          rmse: number | null
          updated_at: string | null
        }
        Insert: {
          absolute_error?: number | null
          actual_value?: number | null
          analysis_date: string
          created_at?: string | null
          customer_id?: string | null
          forecast_accuracy_category?: string | null
          forecast_creation_date?: string | null
          forecast_target_date?: string | null
          forecast_value?: number | null
          id?: number
          lag_days?: number | null
          location_id: string
          mae?: number | null
          mape?: number | null
          percentage_error?: number | null
          planning_bucket: string
          product_id: string
          rmse?: number | null
          updated_at?: string | null
        }
        Update: {
          absolute_error?: number | null
          actual_value?: number | null
          analysis_date?: string
          created_at?: string | null
          customer_id?: string | null
          forecast_accuracy_category?: string | null
          forecast_creation_date?: string | null
          forecast_target_date?: string | null
          forecast_value?: number | null
          id?: number
          lag_days?: number | null
          location_id?: string
          mae?: number | null
          mape?: number | null
          percentage_error?: number | null
          planning_bucket?: string
          product_id?: string
          rmse?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forecast_reconciliation: {
        Row: {
          action_items: string[] | null
          actual_sell_in: number | null
          actual_sell_out: number | null
          channel_partner_id: string | null
          created_at: string | null
          forecast_period: string
          gap_analysis: Json | null
          id: string
          location_id: string
          product_id: string
          reconciliation_status: string | null
          sell_in_accuracy_percentage: number | null
          sell_in_forecast: number
          sell_in_variance: number | null
          sell_out_accuracy_percentage: number | null
          sell_out_forecast: number
          sell_out_variance: number | null
          updated_at: string | null
        }
        Insert: {
          action_items?: string[] | null
          actual_sell_in?: number | null
          actual_sell_out?: number | null
          channel_partner_id?: string | null
          created_at?: string | null
          forecast_period: string
          gap_analysis?: Json | null
          id?: string
          location_id: string
          product_id: string
          reconciliation_status?: string | null
          sell_in_accuracy_percentage?: number | null
          sell_in_forecast?: number
          sell_in_variance?: number | null
          sell_out_accuracy_percentage?: number | null
          sell_out_forecast?: number
          sell_out_variance?: number | null
          updated_at?: string | null
        }
        Update: {
          action_items?: string[] | null
          actual_sell_in?: number | null
          actual_sell_out?: number | null
          channel_partner_id?: string | null
          created_at?: string | null
          forecast_period?: string
          gap_analysis?: Json | null
          id?: string
          location_id?: string
          product_id?: string
          reconciliation_status?: string | null
          sell_in_accuracy_percentage?: number | null
          sell_in_forecast?: number
          sell_in_variance?: number | null
          sell_out_accuracy_percentage?: number | null
          sell_out_forecast?: number
          sell_out_variance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_reconciliation_channel_partner_id_fkey"
            columns: ["channel_partner_id"]
            isOneToOne: false
            referencedRelation: "channel_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_results: {
        Row: {
          actual: number | null
          avg_data_quality_score: number | null
          bucket: string | null
          cleansing_version: string | null
          created_at: string | null
          customer_id: string | null
          data_source: string | null
          explanation: string | null
          forecast: number | null
          forecast_bucket: string | null
          forecast_periods: string | null
          forecast_run_id: string | null
          forecast_timestamp: string | null
          historical_date: string | null
          id: number
          location_id: string
          lower_bound: number | null
          model: string
          normalized_actual: number | null
          p10: number | null
          p25: number | null
          p50: number | null
          p75: number | null
          p90: number | null
          p95: number | null
          product_id: string
          segment: string | null
          time_bucket: string
          top_features: Json | null
          upper_bound: number | null
        }
        Insert: {
          actual?: number | null
          avg_data_quality_score?: number | null
          bucket?: string | null
          cleansing_version?: string | null
          created_at?: string | null
          customer_id?: string | null
          data_source?: string | null
          explanation?: string | null
          forecast?: number | null
          forecast_bucket?: string | null
          forecast_periods?: string | null
          forecast_run_id?: string | null
          forecast_timestamp?: string | null
          historical_date?: string | null
          id?: number
          location_id: string
          lower_bound?: number | null
          model: string
          normalized_actual?: number | null
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          p95?: number | null
          product_id: string
          segment?: string | null
          time_bucket: string
          top_features?: Json | null
          upper_bound?: number | null
        }
        Update: {
          actual?: number | null
          avg_data_quality_score?: number | null
          bucket?: string | null
          cleansing_version?: string | null
          created_at?: string | null
          customer_id?: string | null
          data_source?: string | null
          explanation?: string | null
          forecast?: number | null
          forecast_bucket?: string | null
          forecast_periods?: string | null
          forecast_run_id?: string | null
          forecast_timestamp?: string | null
          historical_date?: string | null
          id?: number
          location_id?: string
          lower_bound?: number | null
          model?: string
          normalized_actual?: number | null
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          p95?: number | null
          product_id?: string
          segment?: string | null
          time_bucket?: string
          top_features?: Json | null
          upper_bound?: number | null
        }
        Relationships: []
      }
      forecast_waterfall_components: {
        Row: {
          analysis_date: string
          baseline_value: number | null
          component_name: string
          component_order: number
          component_value: number
          created_at: string | null
          customer_id: string | null
          final_value: number | null
          id: string
          is_positive: boolean
          location_id: string
          period_end: string | null
          period_start: string | null
          product_id: string
          updated_at: string | null
          waterfall_type: string
        }
        Insert: {
          analysis_date: string
          baseline_value?: number | null
          component_name: string
          component_order: number
          component_value: number
          created_at?: string | null
          customer_id?: string | null
          final_value?: number | null
          id?: string
          is_positive?: boolean
          location_id: string
          period_end?: string | null
          period_start?: string | null
          product_id: string
          updated_at?: string | null
          waterfall_type: string
        }
        Update: {
          analysis_date?: string
          baseline_value?: number | null
          component_name?: string
          component_order?: number
          component_value?: number
          created_at?: string | null
          customer_id?: string | null
          final_value?: number | null
          id?: string
          is_positive?: boolean
          location_id?: string
          period_end?: string | null
          period_start?: string | null
          product_id?: string
          updated_at?: string | null
          waterfall_type?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          created_at: string
          customer_id: string | null
          event_adjusted_quantity: number | null
          event_ids: number[] | null
          has_event: boolean | null
          id: number
          is_outlier: boolean | null
          location_id: string | null
          normalized_quantity: number | null
          outlier_method: string | null
          postdate: string | null
          product_id: string | null
          quantity: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          event_adjusted_quantity?: number | null
          event_ids?: number[] | null
          has_event?: boolean | null
          id?: number
          is_outlier?: boolean | null
          location_id?: string | null
          normalized_quantity?: number | null
          outlier_method?: string | null
          postdate?: string | null
          product_id?: string | null
          quantity?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          event_adjusted_quantity?: number | null
          event_ids?: number[] | null
          has_event?: boolean | null
          id?: number
          is_outlier?: boolean | null
          location_id?: string | null
          normalized_quantity?: number | null
          outlier_method?: string | null
          postdate?: string | null
          product_id?: string | null
          quantity?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["location_id"]
          },
        ]
      }
      inventory_projections: {
        Row: {
          calculation_method: string | null
          created_at: string | null
          demand_variability: number | null
          forecasted_demand: number | null
          id: string
          lead_time_days: number | null
          location_id: string
          planned_receipts: number | null
          product_id: string
          projected_ending_inventory: number | null
          projection_accuracy: number | null
          projection_month: string
          safety_stock_current: number | null
          safety_stock_recommended: number | null
          service_level_target: number | null
          starting_inventory: number | null
          stockout_risk_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          calculation_method?: string | null
          created_at?: string | null
          demand_variability?: number | null
          forecasted_demand?: number | null
          id?: string
          lead_time_days?: number | null
          location_id: string
          planned_receipts?: number | null
          product_id: string
          projected_ending_inventory?: number | null
          projection_accuracy?: number | null
          projection_month: string
          safety_stock_current?: number | null
          safety_stock_recommended?: number | null
          service_level_target?: number | null
          starting_inventory?: number | null
          stockout_risk_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          calculation_method?: string | null
          created_at?: string | null
          demand_variability?: number | null
          forecasted_demand?: number | null
          id?: string
          lead_time_days?: number | null
          location_id?: string
          planned_receipts?: number | null
          product_id?: string
          projected_ending_inventory?: number | null
          projection_accuracy?: number | null
          projection_month?: string
          safety_stock_current?: number | null
          safety_stock_recommended?: number | null
          service_level_target?: number | null
          starting_inventory?: number | null
          stockout_risk_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_projections_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      locations: {
        Row: {
          borrowing_pct: number | null
          created_at: string
          level_1: string | null
          level_2: string | null
          level_3: string | null
          level_4: string | null
          location_id: string
          location_name: string | null
          service_level_goal: number | null
          type: string | null
          updated_at: string | null
          warehouse_control_factors_active: boolean | null
          working_cal: string | null
        }
        Insert: {
          borrowing_pct?: number | null
          created_at?: string
          level_1?: string | null
          level_2?: string | null
          level_3?: string | null
          level_4?: string | null
          location_id: string
          location_name?: string | null
          service_level_goal?: number | null
          type?: string | null
          updated_at?: string | null
          warehouse_control_factors_active?: boolean | null
          working_cal?: string | null
        }
        Update: {
          borrowing_pct?: number | null
          created_at?: string
          level_1?: string | null
          level_2?: string | null
          level_3?: string | null
          level_4?: string | null
          location_id?: string
          location_name?: string | null
          service_level_goal?: number | null
          type?: string | null
          updated_at?: string | null
          warehouse_control_factors_active?: boolean | null
          working_cal?: string | null
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          commercial_user_id: string
          confidence_level: string | null
          created_at: string | null
          customer_id: string
          description: string
          effective_from: string | null
          effective_to: string | null
          id: string
          impact_assessment: string
          intelligence_type: string
          location_id: string | null
          product_id: string | null
          quantitative_impact: number | null
          status: string | null
          time_horizon: string | null
          updated_at: string | null
        }
        Insert: {
          commercial_user_id: string
          confidence_level?: string | null
          created_at?: string | null
          customer_id: string
          description: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          impact_assessment: string
          intelligence_type: string
          location_id?: string | null
          product_id?: string | null
          quantitative_impact?: number | null
          status?: string | null
          time_horizon?: string | null
          updated_at?: string | null
        }
        Update: {
          commercial_user_id?: string
          confidence_level?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          impact_assessment?: string
          intelligence_type?: string
          location_id?: string | null
          product_id?: string | null
          quantitative_impact?: number | null
          status?: string | null
          time_horizon?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      npi_forecast_scenarios: {
        Row: {
          assumptions: string | null
          confidence_level: string | null
          created_at: string | null
          forecast_value: number
          id: string
          npi_product_id: string | null
          postdate: string
          scenario_name: string
          scenario_type: string
          updated_at: string | null
        }
        Insert: {
          assumptions?: string | null
          confidence_level?: string | null
          created_at?: string | null
          forecast_value: number
          id?: string
          npi_product_id?: string | null
          postdate: string
          scenario_name: string
          scenario_type: string
          updated_at?: string | null
        }
        Update: {
          assumptions?: string | null
          confidence_level?: string | null
          created_at?: string | null
          forecast_value?: number
          id?: string
          npi_product_id?: string | null
          postdate?: string
          scenario_name?: string
          scenario_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npi_forecast_scenarios_npi_product_id_fkey"
            columns: ["npi_product_id"]
            isOneToOne: false
            referencedRelation: "npi_products"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_milestones: {
        Row: {
          created_at: string | null
          dependencies: string[] | null
          id: string
          milestone_date: string
          milestone_name: string
          milestone_priority: string | null
          milestone_status: string
          notes: string | null
          npi_product_id: string | null
          responsible_person: string | null
          responsible_team: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dependencies?: string[] | null
          id?: string
          milestone_date: string
          milestone_name: string
          milestone_priority?: string | null
          milestone_status: string
          notes?: string | null
          npi_product_id?: string | null
          responsible_person?: string | null
          responsible_team?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dependencies?: string[] | null
          id?: string
          milestone_date?: string
          milestone_name?: string
          milestone_priority?: string | null
          milestone_status?: string
          notes?: string | null
          npi_product_id?: string | null
          responsible_person?: string | null
          responsible_team?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npi_milestones_npi_product_id_fkey"
            columns: ["npi_product_id"]
            isOneToOne: false
            referencedRelation: "npi_products"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_products: {
        Row: {
          cannibalization_products: string[] | null
          created_at: string | null
          expected_roi: number | null
          id: string
          launch_confidence_level: string | null
          launch_date: string | null
          launch_locations: string[] | null
          launch_volume_projection: number | null
          market_penetration_rate: number | null
          market_segment: string | null
          notes: string | null
          npi_status: string
          product_id: string | null
          ramp_up_weeks: number | null
          responsible_planner: string | null
          updated_at: string | null
        }
        Insert: {
          cannibalization_products?: string[] | null
          created_at?: string | null
          expected_roi?: number | null
          id?: string
          launch_confidence_level?: string | null
          launch_date?: string | null
          launch_locations?: string[] | null
          launch_volume_projection?: number | null
          market_penetration_rate?: number | null
          market_segment?: string | null
          notes?: string | null
          npi_status: string
          product_id?: string | null
          ramp_up_weeks?: number | null
          responsible_planner?: string | null
          updated_at?: string | null
        }
        Update: {
          cannibalization_products?: string[] | null
          created_at?: string | null
          expected_roi?: number | null
          id?: string
          launch_confidence_level?: string | null
          launch_date?: string | null
          launch_locations?: string[] | null
          launch_volume_projection?: number | null
          market_penetration_rate?: number | null
          market_segment?: string | null
          notes?: string | null
          npi_status?: string
          product_id?: string | null
          ramp_up_weeks?: number | null
          responsible_planner?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npi_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      opa_results: {
        Row: {
          annual_cost: number | null
          average_order_amount: number | null
          calculated_date: string
          carrying_cost_rate: number | null
          created_at: string | null
          header_cost: number | null
          id: number
          line_cost: number | null
          optimal_order_cycle: number | null
          profit_ratio: number | null
          recommended_bracket: number | null
          vendor_id: number | null
        }
        Insert: {
          annual_cost?: number | null
          average_order_amount?: number | null
          calculated_date: string
          carrying_cost_rate?: number | null
          created_at?: string | null
          header_cost?: number | null
          id?: number
          line_cost?: number | null
          optimal_order_cycle?: number | null
          profit_ratio?: number | null
          recommended_bracket?: number | null
          vendor_id?: number | null
        }
        Update: {
          annual_cost?: number | null
          average_order_amount?: number | null
          calculated_date?: string
          carrying_cost_rate?: number | null
          created_at?: string | null
          header_cost?: number | null
          id?: number
          line_cost?: number | null
          optimal_order_cycle?: number | null
          profit_ratio?: number | null
          recommended_bracket?: number | null
          vendor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opa_results_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      outliers: {
        Row: {
          avg_deviation: number | null
          capped_value: number
          created_at: string | null
          customer_id: string | null
          detection_method: string
          expected_value: number | null
          explanation: string | null
          id: number
          location_id: string
          original_value: number
          postdate: string
          product_id: string
          score: number | null
          severity: string | null
          vendor_id: string | null
        }
        Insert: {
          avg_deviation?: number | null
          capped_value: number
          created_at?: string | null
          customer_id?: string | null
          detection_method: string
          expected_value?: number | null
          explanation?: string | null
          id?: number
          location_id: string
          original_value: number
          postdate: string
          product_id: string
          score?: number | null
          severity?: string | null
          vendor_id?: string | null
        }
        Update: {
          avg_deviation?: number | null
          capped_value?: number
          created_at?: string | null
          customer_id?: string | null
          detection_method?: string
          expected_value?: number | null
          explanation?: string | null
          id?: number
          location_id?: string
          original_value?: number
          postdate?: string
          product_id?: string
          score?: number | null
          severity?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      product_sourcing: {
        Row: {
          active: boolean | null
          buying_multiple: number | null
          created_at: string | null
          id: number
          lead_time_days: number | null
          lead_time_variance: number | null
          minimum_quantity: number | null
          order_point_override: number | null
          product_id: string
          purchase_price: number | null
          safety_stock_override: number | null
          service_level_goal: number | null
          unit_cost: number | null
          updated_at: string | null
          vendor_id: number
          warehouse_id: number
        }
        Insert: {
          active?: boolean | null
          buying_multiple?: number | null
          created_at?: string | null
          id?: number
          lead_time_days?: number | null
          lead_time_variance?: number | null
          minimum_quantity?: number | null
          order_point_override?: number | null
          product_id: string
          purchase_price?: number | null
          safety_stock_override?: number | null
          service_level_goal?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          vendor_id: number
          warehouse_id: number
        }
        Update: {
          active?: boolean | null
          buying_multiple?: number | null
          created_at?: string | null
          id?: number
          lead_time_days?: number | null
          lead_time_variance?: number | null
          minimum_quantity?: number | null
          order_point_override?: number | null
          product_id?: string
          purchase_price?: number | null
          safety_stock_override?: number | null
          service_level_goal?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          vendor_id?: number
          warehouse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_sourcing_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_product_sourcing_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sourcing_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          attr_1: string | null
          attr_2: string | null
          attr_3: string | null
          attr_4: string | null
          buyer_class: string | null
          buying_multiple: number | null
          category_id: string | null
          category_name: string | null
          class_id: string | null
          class_name: string | null
          code: string
          created_at: string | null
          cube_per_unit: number | null
          description: string | null
          id: string
          is_npi: boolean | null
          lead_time_forecast: number | null
          lead_time_variance: number | null
          minimum_quantity: number | null
          npi_launch_date: string | null
          npi_status: string | null
          product_id: string | null
          product_name: string
          purchase_price: number | null
          sales_price: number | null
          service_level_goal: number | null
          shelf_life_days: number | null
          subcategory_id: string | null
          subcategory_name: string | null
          subclass_id: string | null
          subclass_name: string | null
          system_class: string | null
          units_per_case: number | null
          units_per_layer: number | null
          units_per_pallet: number | null
          updated_at: string | null
          vendor_id: number | null
          warehouse_id: number | null
          weight_per_unit: number | null
        }
        Insert: {
          active?: boolean | null
          attr_1?: string | null
          attr_2?: string | null
          attr_3?: string | null
          attr_4?: string | null
          buyer_class?: string | null
          buying_multiple?: number | null
          category_id?: string | null
          category_name?: string | null
          class_id?: string | null
          class_name?: string | null
          code: string
          created_at?: string | null
          cube_per_unit?: number | null
          description?: string | null
          id: string
          is_npi?: boolean | null
          lead_time_forecast?: number | null
          lead_time_variance?: number | null
          minimum_quantity?: number | null
          npi_launch_date?: string | null
          npi_status?: string | null
          product_id?: string | null
          product_name: string
          purchase_price?: number | null
          sales_price?: number | null
          service_level_goal?: number | null
          shelf_life_days?: number | null
          subcategory_id?: string | null
          subcategory_name?: string | null
          subclass_id?: string | null
          subclass_name?: string | null
          system_class?: string | null
          units_per_case?: number | null
          units_per_layer?: number | null
          units_per_pallet?: number | null
          updated_at?: string | null
          vendor_id?: number | null
          warehouse_id?: number | null
          weight_per_unit?: number | null
        }
        Update: {
          active?: boolean | null
          attr_1?: string | null
          attr_2?: string | null
          attr_3?: string | null
          attr_4?: string | null
          buyer_class?: string | null
          buying_multiple?: number | null
          category_id?: string | null
          category_name?: string | null
          class_id?: string | null
          class_name?: string | null
          code?: string
          created_at?: string | null
          cube_per_unit?: number | null
          description?: string | null
          id?: string
          is_npi?: boolean | null
          lead_time_forecast?: number | null
          lead_time_variance?: number | null
          minimum_quantity?: number | null
          npi_launch_date?: string | null
          npi_status?: string | null
          product_id?: string | null
          product_name?: string
          purchase_price?: number | null
          sales_price?: number | null
          service_level_goal?: number | null
          shelf_life_days?: number | null
          subcategory_id?: string | null
          subcategory_name?: string | null
          subclass_id?: string | null
          subclass_name?: string | null
          system_class?: string | null
          units_per_case?: number | null
          units_per_layer?: number | null
          units_per_pallet?: number | null
          updated_at?: string | null
          vendor_id?: number | null
          warehouse_id?: number | null
          weight_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_calculations: {
        Row: {
          calculation_step: string
          created_at: string | null
          id: string
          purchase_order_suggestion_id: string
          step_data: Json
          step_order: number
        }
        Insert: {
          calculation_step: string
          created_at?: string | null
          id?: string
          purchase_order_suggestion_id: string
          step_data?: Json
          step_order: number
        }
        Update: {
          calculation_step?: string
          created_at?: string | null
          id?: string
          purchase_order_suggestion_id?: string
          step_data?: Json
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_po_calculations_suggestion"
            columns: ["purchase_order_suggestion_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_suggestions: {
        Row: {
          available_stock: number | null
          bracket_info: Json | null
          created_at: string | null
          created_by_system: string
          current_stock: number | null
          days_until_stockout: number | null
          demand_forecast: number | null
          expected_delivery_date: string | null
          id: string
          lead_time_days: number | null
          order_date: string | null
          product_id: string
          projected_shortage: number | null
          projected_stockout_month: string | null
          reason: string | null
          recommended_order_urgency: string | null
          reorder_point: number | null
          safety_stock: number | null
          status: string | null
          suggested_quantity: number
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
          urgency_level: string
          vendor_code: string
          vendor_id: number
          vendor_name: string
          warehouse_id: number
        }
        Insert: {
          available_stock?: number | null
          bracket_info?: Json | null
          created_at?: string | null
          created_by_system?: string
          current_stock?: number | null
          days_until_stockout?: number | null
          demand_forecast?: number | null
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          order_date?: string | null
          product_id: string
          projected_shortage?: number | null
          projected_stockout_month?: string | null
          reason?: string | null
          recommended_order_urgency?: string | null
          reorder_point?: number | null
          safety_stock?: number | null
          status?: string | null
          suggested_quantity: number
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          urgency_level?: string
          vendor_code: string
          vendor_id: number
          vendor_name: string
          warehouse_id: number
        }
        Update: {
          available_stock?: number | null
          bracket_info?: Json | null
          created_at?: string | null
          created_by_system?: string
          current_stock?: number | null
          days_until_stockout?: number | null
          demand_forecast?: number | null
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          order_date?: string | null
          product_id?: string
          projected_shortage?: number | null
          projected_stockout_month?: string | null
          reason?: string | null
          recommended_order_urgency?: string | null
          reorder_point?: number | null
          safety_stock?: number | null
          status?: string | null
          suggested_quantity?: number
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          urgency_level?: string
          vendor_code?: string
          vendor_id?: number
          vendor_name?: string
          warehouse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_order_suggestions_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_purchase_order_suggestions_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchase_order_suggestions_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_stock_parameters: {
        Row: {
          active: boolean | null
          calculation_method: string | null
          category_id: string | null
          created_at: string | null
          id: string
          lead_time_variability_factor: number | null
          location_id: string | null
          maximum_safety_stock: number | null
          minimum_safety_stock: number | null
          product_id: string | null
          seasonal_adjustment_factor: number | null
          service_level_target: number | null
          updated_at: string | null
          z_score: number | null
        }
        Insert: {
          active?: boolean | null
          calculation_method?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          lead_time_variability_factor?: number | null
          location_id?: string | null
          maximum_safety_stock?: number | null
          minimum_safety_stock?: number | null
          product_id?: string | null
          seasonal_adjustment_factor?: number | null
          service_level_target?: number | null
          updated_at?: string | null
          z_score?: number | null
        }
        Update: {
          active?: boolean | null
          calculation_method?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          lead_time_variability_factor?: number | null
          location_id?: string | null
          maximum_safety_stock?: number | null
          minimum_safety_stock?: number | null
          product_id?: string | null
          seasonal_adjustment_factor?: number | null
          service_level_target?: number | null
          updated_at?: string | null
          z_score?: number | null
        }
        Relationships: []
      }
      scenario_definitions: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_template: boolean | null
          parameters: Json
          scenario_name: string
          scenario_type: string
          scope: Json
          template_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          parameters: Json
          scenario_name: string
          scenario_type: string
          scope: Json
          template_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          parameters?: Json
          scenario_name?: string
          scenario_type?: string
          scope?: Json
          template_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scenario_executions: {
        Row: {
          baseline_snapshot: Json | null
          error_message: string | null
          execution_time_seconds: number | null
          execution_timestamp: string | null
          id: string
          scenario_id: string | null
          status: string | null
        }
        Insert: {
          baseline_snapshot?: Json | null
          error_message?: string | null
          execution_time_seconds?: number | null
          execution_timestamp?: string | null
          id?: string
          scenario_id?: string | null
          status?: string | null
        }
        Update: {
          baseline_snapshot?: Json | null
          error_message?: string | null
          execution_time_seconds?: number | null
          execution_timestamp?: string | null
          id?: string
          scenario_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_executions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_results: {
        Row: {
          created_at: string | null
          detailed_changes: Json
          id: string
          impact_summary: Json
          scenario_execution_id: string | null
        }
        Insert: {
          created_at?: string | null
          detailed_changes: Json
          id?: string
          impact_summary: Json
          scenario_execution_id?: string | null
        }
        Update: {
          created_at?: string | null
          detailed_changes?: Json
          id?: string
          impact_summary?: Json
          scenario_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_results_scenario_execution_id_fkey"
            columns: ["scenario_execution_id"]
            isOneToOne: false
            referencedRelation: "scenario_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          profile_data: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          profile_data?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          profile_data?: Json | null
        }
        Relationships: []
      }
      sell_in_data: {
        Row: {
          channel_partner_id: string | null
          created_at: string | null
          discount_percentage: number | null
          id: string
          lead_time_days: number | null
          location_id: string
          order_number: string | null
          product_id: string
          promotion_type: string | null
          promotional_activity: boolean | null
          quantity: number
          shipment_method: string | null
          total_value: number | null
          transaction_date: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          channel_partner_id?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          lead_time_days?: number | null
          location_id: string
          order_number?: string | null
          product_id: string
          promotion_type?: string | null
          promotional_activity?: boolean | null
          quantity?: number
          shipment_method?: string | null
          total_value?: number | null
          transaction_date: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_partner_id?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          lead_time_days?: number | null
          location_id?: string
          order_number?: string | null
          product_id?: string
          promotion_type?: string | null
          promotional_activity?: boolean | null
          quantity?: number
          shipment_method?: string | null
          total_value?: number | null
          transaction_date?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_in_data_channel_partner_id_fkey"
            columns: ["channel_partner_id"]
            isOneToOne: false
            referencedRelation: "channel_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_out_data: {
        Row: {
          channel_partner_id: string | null
          created_at: string | null
          customer_segment: string | null
          discount_percentage: number | null
          id: string
          inventory_on_hand: number | null
          location_id: string
          pos_system_id: string | null
          product_id: string
          promotion_type: string | null
          promotional_activity: boolean | null
          quantity: number
          store_id: string | null
          total_value: number | null
          transaction_date: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          channel_partner_id?: string | null
          created_at?: string | null
          customer_segment?: string | null
          discount_percentage?: number | null
          id?: string
          inventory_on_hand?: number | null
          location_id: string
          pos_system_id?: string | null
          product_id: string
          promotion_type?: string | null
          promotional_activity?: boolean | null
          quantity?: number
          store_id?: string | null
          total_value?: number | null
          transaction_date: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_partner_id?: string | null
          created_at?: string | null
          customer_segment?: string | null
          discount_percentage?: number | null
          id?: string
          inventory_on_hand?: number | null
          location_id?: string
          pos_system_id?: string | null
          product_id?: string
          promotion_type?: string | null
          promotional_activity?: boolean | null
          quantity?: number
          store_id?: string | null
          total_value?: number | null
          transaction_date?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_out_data_channel_partner_id_fkey"
            columns: ["channel_partner_id"]
            isOneToOne: false
            referencedRelation: "channel_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_through_rates: {
        Row: {
          calculation_period: string
          channel_partner_id: string | null
          created_at: string | null
          days_of_inventory: number | null
          id: string
          inventory_turn_rate: number | null
          location_id: string
          performance_category: string | null
          period_type: string
          product_id: string
          sell_in_quantity: number
          sell_out_quantity: number
          sell_through_rate: number
          updated_at: string | null
          velocity_trend: string | null
        }
        Insert: {
          calculation_period: string
          channel_partner_id?: string | null
          created_at?: string | null
          days_of_inventory?: number | null
          id?: string
          inventory_turn_rate?: number | null
          location_id: string
          performance_category?: string | null
          period_type?: string
          product_id: string
          sell_in_quantity?: number
          sell_out_quantity?: number
          sell_through_rate?: number
          updated_at?: string | null
          velocity_trend?: string | null
        }
        Update: {
          calculation_period?: string
          channel_partner_id?: string | null
          created_at?: string | null
          days_of_inventory?: number | null
          id?: string
          inventory_turn_rate?: number | null
          location_id?: string
          performance_category?: string | null
          period_type?: string
          product_id?: string
          sell_in_quantity?: number
          sell_out_quantity?: number
          sell_through_rate?: number
          updated_at?: string | null
          velocity_trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_through_rates_channel_partner_id_fkey"
            columns: ["channel_partner_id"]
            isOneToOne: false
            referencedRelation: "channel_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_status: {
        Row: {
          back_order: number | null
          held_until: string | null
          id: number
          item_order_point: number | null
          last_updated: string | null
          on_hand: number | null
          on_order: number | null
          order_up_to_level: number | null
          product_id: string | null
          quantity_held: number | null
          reserved: number | null
          safety_stock: number | null
          vendor_order_point: number | null
        }
        Insert: {
          back_order?: number | null
          held_until?: string | null
          id?: number
          item_order_point?: number | null
          last_updated?: string | null
          on_hand?: number | null
          on_order?: number | null
          order_up_to_level?: number | null
          product_id?: string | null
          quantity_held?: number | null
          reserved?: number | null
          safety_stock?: number | null
          vendor_order_point?: number | null
        }
        Update: {
          back_order?: number | null
          held_until?: string | null
          id?: number
          item_order_point?: number | null
          last_updated?: string | null
          on_hand?: number | null
          on_order?: number | null
          order_up_to_level?: number | null
          product_id?: string | null
          quantity_held?: number | null
          reserved?: number | null
          safety_stock?: number | null
          vendor_order_point?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_status_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_network_analysis_cache: {
        Row: {
          analysis_parameters: Json
          analysis_result: Json
          analysis_type: string
          computed_at: string | null
          expires_at: string | null
          id: string
          is_valid: boolean | null
        }
        Insert: {
          analysis_parameters: Json
          analysis_result: Json
          analysis_type: string
          computed_at?: string | null
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
        }
        Update: {
          analysis_parameters?: Json
          analysis_result?: Json
          analysis_type?: string
          computed_at?: string | null
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
        }
        Relationships: []
      }
      supply_network_configurations: {
        Row: {
          config_category: string | null
          config_key: string
          config_value: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_config: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_category?: string | null
          config_key: string
          config_value: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_config?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_category?: string | null
          config_key?: string
          config_value?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_config?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supply_network_node_properties: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_required: boolean | null
          is_system_property: boolean | null
          node_id: string
          property_key: string
          property_type: string | null
          property_value: Json
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_required?: boolean | null
          is_system_property?: boolean | null
          node_id: string
          property_key: string
          property_type?: string | null
          property_value: Json
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_required?: boolean | null
          is_system_property?: boolean | null
          node_id?: string
          property_key?: string
          property_type?: string | null
          property_value?: Json
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_network_node_properties_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "supply_network_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_network_node_types: {
        Row: {
          color_code: string | null
          created_at: string | null
          default_properties: Json | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          type_code: string
          type_name: string
          updated_at: string | null
        }
        Insert: {
          color_code?: string | null
          created_at?: string | null
          default_properties?: Json | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          type_code: string
          type_name: string
          updated_at?: string | null
        }
        Update: {
          color_code?: string | null
          created_at?: string | null
          default_properties?: Json | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          type_code?: string
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supply_network_nodes: {
        Row: {
          address: string | null
          capacity_metrics: Json | null
          city: string | null
          contact_information: Json | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hierarchy_level: number | null
          hierarchy_path: string | null
          id: string
          latitude: number | null
          longitude: number | null
          node_code: string
          node_name: string
          node_type_id: string
          operational_hours: Json | null
          parent_node_id: string | null
          postal_code: string | null
          state_province: string | null
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          address?: string | null
          capacity_metrics?: Json | null
          city?: string | null
          contact_information?: Json | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          hierarchy_path?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          node_code: string
          node_name: string
          node_type_id: string
          operational_hours?: Json | null
          parent_node_id?: string | null
          postal_code?: string | null
          state_province?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          address?: string | null
          capacity_metrics?: Json | null
          city?: string | null
          contact_information?: Json | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          hierarchy_path?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          node_code?: string
          node_name?: string
          node_type_id?: string
          operational_hours?: Json | null
          parent_node_id?: string | null
          postal_code?: string | null
          state_province?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_network_nodes_node_type_id_fkey"
            columns: ["node_type_id"]
            isOneToOne: false
            referencedRelation: "supply_network_node_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_network_nodes_parent_node_id_fkey"
            columns: ["parent_node_id"]
            isOneToOne: false
            referencedRelation: "supply_network_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_network_relationship_properties: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_system_property: boolean | null
          property_key: string
          property_type: string | null
          property_value: Json
          relationship_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_system_property?: boolean | null
          property_key: string
          property_type?: string | null
          property_value: Json
          relationship_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_system_property?: boolean | null
          property_key?: string
          property_type?: string | null
          property_value?: Json
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_network_relationship_properties_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "supply_network_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_network_relationship_types: {
        Row: {
          allows_multiple: boolean | null
          created_at: string | null
          default_properties: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          is_directed: boolean | null
          type_code: string
          type_name: string
          updated_at: string | null
        }
        Insert: {
          allows_multiple?: boolean | null
          created_at?: string | null
          default_properties?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_directed?: boolean | null
          type_code: string
          type_name: string
          updated_at?: string | null
        }
        Update: {
          allows_multiple?: boolean | null
          created_at?: string | null
          default_properties?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_directed?: boolean | null
          type_code?: string
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supply_network_relationships: {
        Row: {
          alternate_lead_time_days: number | null
          alternate_sources: Json | null
          alternate_transport_cost: number | null
          alternate_transport_method: string | null
          capacity: number | null
          capacity_constraint: number | null
          cost: number | null
          cost_unit: string
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_bidirectional: boolean
          lead_time_days: number | null
          primary_transport_cost: number
          primary_transport_method: string
          priority_rank: number
          relationship_code: string | null
          relationship_type_id: string
          source_node_id: string
          status: string | null
          strength: number | null
          target_node_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          alternate_lead_time_days?: number | null
          alternate_sources?: Json | null
          alternate_transport_cost?: number | null
          alternate_transport_method?: string | null
          capacity?: number | null
          capacity_constraint?: number | null
          cost?: number | null
          cost_unit?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_bidirectional?: boolean
          lead_time_days?: number | null
          primary_transport_cost?: number
          primary_transport_method?: string
          priority_rank?: number
          relationship_code?: string | null
          relationship_type_id: string
          source_node_id: string
          status?: string | null
          strength?: number | null
          target_node_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          alternate_lead_time_days?: number | null
          alternate_sources?: Json | null
          alternate_transport_cost?: number | null
          alternate_transport_method?: string | null
          capacity?: number | null
          capacity_constraint?: number | null
          cost?: number | null
          cost_unit?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_bidirectional?: boolean
          lead_time_days?: number | null
          primary_transport_cost?: number
          primary_transport_method?: string
          priority_rank?: number
          relationship_code?: string | null
          relationship_type_id?: string
          source_node_id?: string
          status?: string | null
          strength?: number | null
          target_node_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_network_relationships_relationship_type_id_fkey"
            columns: ["relationship_type_id"]
            isOneToOne: false
            referencedRelation: "supply_network_relationship_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_network_relationships_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "supply_network_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_network_relationships_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "supply_network_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          client_levels: number | null
          id: number
          location_levels: number | null
          product_levels: number | null
          system_date: string
          vendor_levels: number | null
        }
        Insert: {
          client_levels?: number | null
          id?: number
          location_levels?: number | null
          product_levels?: number | null
          system_date?: string
          vendor_levels?: number | null
        }
        Update: {
          client_levels?: number | null
          id?: number
          location_levels?: number | null
          product_levels?: number | null
          system_date?: string
          vendor_levels?: number | null
        }
        Relationships: []
      }
      system_execution_log: {
        Row: {
          component: string
          configuration_used: Json | null
          cpu_usage_percent: number | null
          created_at: string | null
          duration_seconds: number | null
          end_time: string | null
          error_message: string | null
          execution_id: string
          id: string
          memory_usage_mb: number | null
          records_generated: number | null
          records_processed: number | null
          start_time: string
          status: string
          summary_stats: Json | null
        }
        Insert: {
          component: string
          configuration_used?: Json | null
          cpu_usage_percent?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          error_message?: string | null
          execution_id: string
          id?: string
          memory_usage_mb?: number | null
          records_generated?: number | null
          records_processed?: number | null
          start_time: string
          status: string
          summary_stats?: Json | null
        }
        Update: {
          component?: string
          configuration_used?: Json | null
          cpu_usage_percent?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          error_message?: string | null
          execution_id?: string
          id?: string
          memory_usage_mb?: number | null
          records_generated?: number | null
          records_processed?: number | null
          start_time?: string
          status?: string
          summary_stats?: Json | null
        }
        Relationships: []
      }
      user_product_assignments: {
        Row: {
          assignment_type: string | null
          created_at: string | null
          customer_id: string
          end_date: string | null
          id: string
          product_id: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_type?: string | null
          created_at?: string | null
          customer_id: string
          end_date?: string | null
          id?: string
          product_id: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_type?: string | null
          created_at?: string | null
          customer_id?: string
          end_date?: string | null
          id?: string
          product_id?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          active: boolean | null
          company_id: number | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_id?: number | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: number | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendor_brackets: {
        Row: {
          active: boolean | null
          bracket_number: number
          created_at: string | null
          discount_percentage: number | null
          freight_cost: number | null
          freight_per_order: number | null
          id: number
          maximum_value: number | null
          minimum_value: number | null
          savings_per_order: number | null
          savings_per_unit: number | null
          unit_type: number | null
          up_to_max_option: number | null
          vendor_id: number | null
          warehouse_id: number | null
        }
        Insert: {
          active?: boolean | null
          bracket_number: number
          created_at?: string | null
          discount_percentage?: number | null
          freight_cost?: number | null
          freight_per_order?: number | null
          id?: number
          maximum_value?: number | null
          minimum_value?: number | null
          savings_per_order?: number | null
          savings_per_unit?: number | null
          unit_type?: number | null
          up_to_max_option?: number | null
          vendor_id?: number | null
          warehouse_id?: number | null
        }
        Update: {
          active?: boolean | null
          bracket_number?: number
          created_at?: string | null
          discount_percentage?: number | null
          freight_cost?: number | null
          freight_per_order?: number | null
          id?: number
          maximum_value?: number | null
          minimum_value?: number | null
          savings_per_order?: number | null
          savings_per_unit?: number | null
          unit_type?: number | null
          up_to_max_option?: number | null
          vendor_id?: number | null
          warehouse_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_brackets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_brackets_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean | null
          automatic_rebuild: number | null
          buyer_id: number | null
          code: string
          created_at: string | null
          current_bracket: number | null
          id: number
          lead_time_forecast: number | null
          lead_time_quoted: number | null
          lead_time_variance: number | null
          name: string
          order_cycle: number | null
          service_level_goal: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          automatic_rebuild?: number | null
          buyer_id?: number | null
          code: string
          created_at?: string | null
          current_bracket?: number | null
          id?: number
          lead_time_forecast?: number | null
          lead_time_quoted?: number | null
          lead_time_variance?: number | null
          name: string
          order_cycle?: number | null
          service_level_goal?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          automatic_rebuild?: number | null
          buyer_id?: number | null
          code?: string
          created_at?: string | null
          current_bracket?: number | null
          id?: number
          lead_time_forecast?: number | null
          lead_time_quoted?: number | null
          lead_time_variance?: number | null
          name?: string
          order_cycle?: number | null
          service_level_goal?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          active: boolean | null
          address: string | null
          code: string
          company_id: number | null
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          code: string
          company_id?: number | null
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          code?: string
          company_id?: number | null
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      what_if_scenarios: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          baseline_values: Json | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          location_id: string
          parameters: Json
          product_id: string
          results: Json | null
          scenario_name: string
          scenario_type: string
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          baseline_values?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          location_id: string
          parameters?: Json
          product_id: string
          results?: Json | null
          scenario_name: string
          scenario_type?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          baseline_values?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          location_id?: string
          parameters?: Json
          product_id?: string
          results?: Json | null
          scenario_name?: string
          scenario_type?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      forecast_results_with_outlier_impact: {
        Row: {
          actual: number | null
          bucket: string | null
          created_at: string | null
          customer_id: string | null
          explanation: string | null
          forecast: number | null
          forecast_bucket: string | null
          forecast_periods: string | null
          forecast_timestamp: string | null
          id: number | null
          location_id: string | null
          lower_bound: number | null
          model: string | null
          normalized_actual: number | null
          outlier_impact: number | null
          outlier_impact_percentage: number | null
          p10: number | null
          p25: number | null
          p50: number | null
          p75: number | null
          p90: number | null
          p95: number | null
          product_id: string | null
          segment: string | null
          time_bucket: string | null
          top_features: Json | null
          upper_bound: number | null
        }
        Insert: {
          actual?: number | null
          bucket?: string | null
          created_at?: string | null
          customer_id?: string | null
          explanation?: string | null
          forecast?: number | null
          forecast_bucket?: string | null
          forecast_periods?: string | null
          forecast_timestamp?: string | null
          id?: number | null
          location_id?: string | null
          lower_bound?: number | null
          model?: string | null
          normalized_actual?: number | null
          outlier_impact?: never
          outlier_impact_percentage?: never
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          p95?: number | null
          product_id?: string | null
          segment?: string | null
          time_bucket?: string | null
          top_features?: Json | null
          upper_bound?: number | null
        }
        Update: {
          actual?: number | null
          bucket?: string | null
          created_at?: string | null
          customer_id?: string | null
          explanation?: string | null
          forecast?: number | null
          forecast_bucket?: string | null
          forecast_periods?: string | null
          forecast_timestamp?: string | null
          id?: number | null
          location_id?: string | null
          lower_bound?: number | null
          model?: string | null
          normalized_actual?: number | null
          outlier_impact?: never
          outlier_impact_percentage?: never
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          p95?: number | null
          product_id?: string | null
          segment?: string | null
          time_bucket?: string | null
          top_features?: Json | null
          upper_bound?: number | null
        }
        Relationships: []
      }
      forecast_with_fitted_history: {
        Row: {
          actual: number | null
          commercial_input: number | null
          customer_id: string | null
          demand_planner: number | null
          fitted_history: number | null
          forecast: number | null
          forecast_ly: number | null
          location_id: string | null
          lower_bound: number | null
          postdate: string | null
          product_id: string | null
          sales_plan: number | null
          upper_bound: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
    }
    Functions: {
      calculate_build_up_waterfall: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_customer_id?: string
          p_analysis_date?: string
        }
        Returns: {
          component_name: string
          component_value: number
          component_order: number
          is_positive: boolean
        }[]
      }
      calculate_days_of_supply: {
        Args: { current_stock: number; daily_demand: number }
        Returns: number
      }
      calculate_eoq: {
        Args: {
          annual_demand: number
          ordering_cost: number
          holding_cost_per_unit: number
        }
        Returns: number
      }
      calculate_period_comparison_waterfall: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_customer_id?: string
          p_current_date?: string
          p_previous_date?: string
        }
        Returns: {
          component_name: string
          component_value: number
          component_order: number
          is_positive: boolean
          baseline_value: number
          final_value: number
        }[]
      }
      calculate_sell_through_rate: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_channel_partner_id: string
          p_period_start: string
          p_period_end: string
        }
        Returns: number
      }
      crosstab: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      crosstab2: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["tablefunc_crosstab_2"][]
      }
      crosstab3: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["tablefunc_crosstab_3"][]
      }
      crosstab4: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["tablefunc_crosstab_4"][]
      }
      get_company_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          company_name: string
          company_logo: string
        }[]
      }
      get_forecast_pivot_table: {
        Args: { p_location_id: string; p_product_id: string }
        Returns: {
          series: string
          pivot_columns: Json
        }[]
      }
      get_order_calculation_summary: {
        Args: { order_id_param: string }
        Returns: {
          calculation_summary: string
          key_metrics: Json
          cost_breakdown: Json
        }[]
      }
      get_product_velocity: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_days_back?: number
        }
        Returns: number
      }
      get_products_below_order_point: {
        Args: { warehouse_filter?: number }
        Returns: {
          product_id: string
          product_code: string
          current_balance: number
          order_point: number
        }[]
      }
      get_supply_network_graph: {
        Args: Record<PropertyKey, never>
        Returns: {
          nodes: Json
          relationships: Json
        }[]
      }
      get_supply_network_node_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          type_code: string
          type_name: string
          description: string
          icon_name: string
          color_code: string
          default_properties: Json
        }[]
      }
      get_supply_network_relationship_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          type_code: string
          type_name: string
          description: string
          is_directed: boolean
          allows_multiple: boolean
          default_properties: Json
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      reconcile_forecasts: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_forecast_period: string
        }
        Returns: string
      }
      refresh_sell_through_rates: {
        Args: { p_period_start?: string; p_period_end?: string }
        Returns: boolean
      }
      refresh_waterfall_components: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_customer_id?: string
          p_waterfall_type?: string
        }
        Returns: boolean
      }
      validate_alternate_sources: {
        Args: { alternate_sources: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "demand_planner"
        | "supply_planner"
        | "user"
        | "administrator"
      cost_unit_type:
        | "per_unit"
        | "per_shipment"
        | "per_kg"
        | "per_pallet"
        | "per_container"
      emaildeliverytype: "attachment" | "inline"
      loc_type: "Cedis" | "Planta" | "Tienda" | "Cross Dock"
      objecttype: "query" | "chart" | "dashboard" | "dataset"
      sliceemailreportformat: "visualization" | "data"
      tagtype: "custom" | "type" | "owner" | "favorited_by"
      transportation_method:
        | "truck"
        | "rail"
        | "air"
        | "sea"
        | "pipeline"
        | "courier"
        | "intermodal"
    }
    CompositeTypes: {
      tablefunc_crosstab_2: {
        row_name: string | null
        category_1: string | null
        category_2: string | null
      }
      tablefunc_crosstab_3: {
        row_name: string | null
        category_1: string | null
        category_2: string | null
        category_3: string | null
      }
      tablefunc_crosstab_4: {
        row_name: string | null
        category_1: string | null
        category_2: string | null
        category_3: string | null
        category_4: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "demand_planner",
        "supply_planner",
        "user",
        "administrator",
      ],
      cost_unit_type: [
        "per_unit",
        "per_shipment",
        "per_kg",
        "per_pallet",
        "per_container",
      ],
      emaildeliverytype: ["attachment", "inline"],
      loc_type: ["Cedis", "Planta", "Tienda", "Cross Dock"],
      objecttype: ["query", "chart", "dashboard", "dataset"],
      sliceemailreportformat: ["visualization", "data"],
      tagtype: ["custom", "type", "owner", "favorited_by"],
      transportation_method: [
        "truck",
        "rail",
        "air",
        "sea",
        "pipeline",
        "courier",
        "intermodal",
      ],
    },
  },
} as const
