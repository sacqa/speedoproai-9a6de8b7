export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          area: string
          created_at: string
          details: string | null
          id: string
          is_default: boolean
          label: string
          phone: string
          recipient_name: string
          street: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          details?: string | null
          id?: string
          is_default?: boolean
          label: string
          phone: string
          recipient_name: string
          street: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          details?: string | null
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          recipient_name?: string
          street?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_label: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
        }
        Relationships: []
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banners: {
        Row: {
          cta_label: string | null
          cta_link: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      broadcast_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          push_sent: number
          title: string
          url: string | null
          users_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          push_sent?: number
          title: string
          url?: string | null
          users_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          push_sent?: number
          title?: string
          url?: string | null
          users_count?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_hot_selling: boolean
          is_popular: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_hot_selling?: boolean
          is_popular?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_hot_selling?: boolean
          is_popular?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          hero_image_url: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          area: string
          closes_at: string | null
          created_at: string
          delivery_fee: number
          eta_max_minutes: number
          eta_min_minutes: number
          free_delivery_threshold: number | null
          id: string
          is_active: boolean
          min_order: number
          opens_at: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area: string
          closes_at?: string | null
          created_at?: string
          delivery_fee?: number
          eta_max_minutes?: number
          eta_min_minutes?: number
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          min_order?: number
          opens_at?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area?: string
          closes_at?: string | null
          created_at?: string
          delivery_fee?: number
          eta_max_minutes?: number
          eta_min_minutes?: number
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          min_order?: number
          opens_at?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      food_menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_menu_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          sort_order?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_vendors: {
        Row: {
          address: string | null
          closes_at: string | null
          commission_percent: number
          cover_url: string | null
          created_at: string
          cuisine: string | null
          delivery_time_min: number
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_open: boolean
          logo_url: string | null
          min_order: number
          name: string
          opens_at: string | null
          phone: string | null
          rating: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          closes_at?: string | null
          commission_percent?: number
          cover_url?: string | null
          created_at?: string
          cuisine?: string | null
          delivery_time_min?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_open?: boolean
          logo_url?: string | null
          min_order?: number
          name: string
          opens_at?: string | null
          phone?: string | null
          rating?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          closes_at?: string | null
          commission_percent?: number
          cover_url?: string | null
          created_at?: string
          cuisine?: string | null
          delivery_time_min?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_open?: boolean
          logo_url?: string | null
          min_order?: number
          name?: string
          opens_at?: string | null
          phone?: string | null
          rating?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Relationships: []
      }
      guest_orders: {
        Row: {
          area: string
          attachment_url: string | null
          created_at: string
          customer_name: string
          delivery_fee: number
          details: string | null
          id: string
          items: Json
          meta: Json
          notes: string | null
          order_number: string
          payment_method: string
          phone: string
          service_type: string
          status: string
          street: string
          subtotal: number
          total: number
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          area: string
          attachment_url?: string | null
          created_at?: string
          customer_name: string
          delivery_fee?: number
          details?: string | null
          id?: string
          items?: Json
          meta?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string
          phone: string
          service_type?: string
          status?: string
          street: string
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          area?: string
          attachment_url?: string | null
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          details?: string | null
          id?: string
          items?: Json
          meta?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string
          phone?: string
          service_type?: string
          status?: string
          street?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      notification_replies: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_id: string | null
          order_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_id?: string | null
          order_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_id?: string | null
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_replies_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_instructions: {
        Row: {
          author_role: string
          created_at: string
          id: string
          image_url: string | null
          message: string
          order_id: string
          user_id: string
        }
        Insert: {
          author_role?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          order_id: string
          user_id: string
        }
        Update: {
          author_role?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          order_id?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          name: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          unit: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          name: string
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
          unit?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_logs: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          address_snapshot: Json | null
          created_at: string
          custom_details: Json | null
          delivery_fee: number
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_txn_id: string | null
          prescription_url: string | null
          rider_id: string | null
          service_charge: number
          speedsend_details: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          address_id?: string | null
          address_snapshot?: Json | null
          created_at?: string
          custom_details?: Json | null
          delivery_fee?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_txn_id?: string | null
          prescription_url?: string | null
          rider_id?: string | null
          service_charge?: number
          speedsend_details?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          address_id?: string | null
          address_snapshot?: Json | null
          created_at?: string
          custom_details?: Json | null
          delivery_fee?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_txn_id?: string | null
          prescription_url?: string | null
          rider_id?: string | null
          service_charge?: number
          speedsend_details?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          description: string | null
          id: string
          key: string
          value: number
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          value: number
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          value?: number
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_delta: number
          product_id: string
          sort_order: number
          stock: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_delta?: number
          product_id: string
          sort_order?: number
          stock?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_delta?: number
          product_id?: string
          sort_order?: number
          stock?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          stock: number
          unit: string | null
        }
        Insert: {
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price: number
          stock?: number
          unit?: string | null
        }
        Update: {
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          stock?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          dob: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_banners: {
        Row: {
          created_at: string
          gradient_from: string | null
          gradient_to: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link: string
          service_key: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gradient_from?: string | null
          gradient_to?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string
          service_key: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gradient_from?: string | null
          gradient_to?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string
          service_key?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          lat: number
          lng: number
          share_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          lat: number
          lng: number
          share_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          lat?: number
          lng?: number
          share_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_check_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      claim_admin_if_none: { Args: never; Returns: boolean }
      get_vendor_commission: { Args: { _vendor_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_guest_order: {
        Args: { _order_number: string; _phone: string }
        Returns: {
          area: string
          created_at: string
          customer_name: string
          delivery_fee: number
          details: string
          id: string
          items: Json
          notes: string
          order_number: string
          service_type: string
          status: string
          street: string
          subtotal: number
          total: number
          updated_at: string
          vendor_name: string
        }[]
      }
      place_guest_order: {
        Args: {
          _area: string
          _attachment_url?: string
          _customer_name: string
          _delivery_fee: number
          _details?: string
          _items: Json
          _meta?: Json
          _notes?: string
          _phone: string
          _service_type?: string
          _street: string
          _subtotal: number
          _total: number
          _vendor_id?: string
          _vendor_name?: string
        }
        Returns: {
          id: string
          order_number: string
        }[]
      }
      try_auto_approve_self: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer" | "rider" | "super_admin" | "staff"
      friendship_status: "pending" | "accepted" | "declined" | "blocked"
      order_status:
        | "submitted"
        | "waiting_for_estimate"
        | "awaiting_payment"
        | "payment_under_review"
        | "payment_verified"
        | "rider_assigned"
        | "purchasing_items"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      order_type: "speedmart" | "pharmacy" | "speedsend" | "custom" | "food"
      payment_method: "jazzcash" | "easypaisa" | "bank_transfer" | "cod"
      payment_status: "pending" | "submitted" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: ["admin", "customer", "rider", "super_admin", "staff"],
      friendship_status: ["pending", "accepted", "declined", "blocked"],
      order_status: [
        "submitted",
        "waiting_for_estimate",
        "awaiting_payment",
        "payment_under_review",
        "payment_verified",
        "rider_assigned",
        "purchasing_items",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      order_type: ["speedmart", "pharmacy", "speedsend", "custom", "food"],
      payment_method: ["jazzcash", "easypaisa", "bank_transfer", "cod"],
      payment_status: ["pending", "submitted", "approved", "rejected"],
    },
  },
} as const
