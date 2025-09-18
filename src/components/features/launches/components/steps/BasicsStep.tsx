import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, MapPin, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { Basics } from '../../types';

const basicsSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  parent: z.string().optional(),
  uom: z.string().min(1, 'Unit of measure is required'),
  packSize: z.string().optional(),
  gtin: z.string().optional(),
  launchDate: z.string().min(1, 'Launch date is required'),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
});

type BasicsFormData = z.infer<typeof basicsSchema>;

const categories = [
  'Beverages/Cola',
  'Beverages/Soda',
  'Beverages/Water',
  'Snacks/Chips',
  'Snacks/Cookies',
  'Dairy/Milk',
  'Dairy/Yogurt',
];

const brands = [
  'M8 Cola',
  'Citrus Fresh',
  'Aqua Pure',
  'Snack Master',
  'Dairy Gold',
];

const uoms = ['EA', 'CA', 'PK', 'BX'];

const locations = [
  { id: 'DC_MEX', label: 'Mexico City DC' },
  { id: 'DC_GDL', label: 'Guadalajara DC' },
  { id: 'DC_MTY', label: 'Monterrey DC' },
  { id: 'DC_TIJ', label: 'Tijuana DC' },
];

const channels = [
  { id: 'ModernTrade', label: 'Modern Trade' },
  { id: 'TraditionalTrade', label: 'Traditional Trade' },
  { id: 'eCommerce', label: 'E-Commerce' },
  { id: 'Foodservice', label: 'Food Service' },
];

export function BasicsStep() {
  const { t } = useTranslation();
  const { currentDraft, updateDraft } = useLaunchWizardStore();

  const form = useForm<BasicsFormData>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      name: currentDraft?.basics.name || '',
      category: currentDraft?.basics.category || '',
      brand: currentDraft?.basics.brand || '',
      parent: currentDraft?.basics.parent || '',
      uom: currentDraft?.basics.uom || 'EA',
      packSize: currentDraft?.basics.packSize || '',
      gtin: currentDraft?.basics.gtin || '',
      launchDate: currentDraft?.basics.launchDate || '',
      locations: currentDraft?.basics.locations || [],
      channels: currentDraft?.basics.channels || [],
    },
  });

  const onSubmit = (data: BasicsFormData) => {
    if (currentDraft) {
      updateDraft({
        basics: {
          name: data.name,
          category: data.category,
          brand: data.brand,
          parent: data.parent || '',
          uom: data.uom,
          packSize: data.packSize || '',
          gtin: data.gtin || '',
          lifecycle: 'launch' as const,
          launchDate: data.launchDate,
          locations: data.locations,
          channels: data.channels,
        } as Basics,
      });
    }
  };

  // Auto-save on form changes
  React.useEffect(() => {
    const subscription = form.watch((data) => {
      if (currentDraft && data.name && data.category && data.brand && data.launchDate && data.locations && data.channels && data.uom) {
        updateDraft({
          basics: {
            name: data.name,
            category: data.category,
            brand: data.brand,
            parent: data.parent || '',
            uom: data.uom,
            packSize: data.packSize || '',
            gtin: data.gtin || '',
            lifecycle: 'launch' as const,
            launchDate: data.launchDate,
            locations: data.locations,
            channels: data.channels,
          } as Basics,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, updateDraft]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('basics.title')}</h2>
        <p className="text-muted-foreground">{t('basics.subtitle')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Product Information
              </CardTitle>
              <CardDescription>
                Basic product details and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.productName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('basics.productName.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.category')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('basics.category.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.brand')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('basics.brand.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.parent')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('basics.parent.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.uom')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {uoms.map((uom) => (
                            <SelectItem key={uom} value={uom}>
                              {uom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="packSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.packSize')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('basics.packSize.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gtin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basics.gtin')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('basics.gtin.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="launchDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('basics.launchDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), 'PPP')
                              ) : (
                                <span>{t('basics.launchDate.placeholder')}</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Distribution & Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Distribution & Channels
              </CardTitle>
              <CardDescription>
                Select initial launch locations and sales channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="locations"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('basics.locations')}</FormLabel>
                    <div className="grid md:grid-cols-2 gap-3">
                      {locations.map((location) => (
                        <FormField
                          key={location.id}
                          control={form.control}
                          name="locations"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(location.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, location.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== location.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {location.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="channels"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('basics.channels')}</FormLabel>
                    <div className="grid md:grid-cols-2 gap-3">
                      {channels.map((channel) => (
                        <FormField
                          key={channel.id}
                          control={form.control}
                          name="channels"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(channel.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, channel.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== channel.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {channel.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}