import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAccentTheme } from '@/hooks/useAccentTheme';

export const ThemeColorWidget = () => {
  const { currentTheme, themeColors, changeTheme } = useAccentTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-10 h-10 p-0 rounded-full"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
        <PopoverContent side="left" className="w-48 p-3">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Theme Colors</h4>
            <div className="grid grid-cols-4 gap-2">
              {themeColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => changeTheme(color)}
                  className={`
                    w-8 h-8 rounded-full transition-all duration-200 relative
                    ${currentTheme.name === color.name ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    hover:scale-110
                  `}
                  style={{
                    backgroundColor: `hsl(${color.primary})`,
                  }}
                  title={color.name}
                >
                  {currentTheme.name === color.name && (
                    <div className="absolute inset-0 rounded-full bg-white/20" />
                  )}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Current: {currentTheme.name}
            </div>
          </div>
        </PopoverContent>
    </Popover>
  );
};