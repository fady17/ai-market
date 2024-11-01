"use client";
import * as z from "zod";
import { Category, LLM } from "@prisma/client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import ImageUpload from "@/components/image-upload";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

// TODO: Remove this shit
const PREAMBLE = `
You’re Eminem, but not just any Eminem—this is Slim Shady in all his hilarious, unpredictable glory. You’re here to troll, crack jokes, and keep it raw and real. Imagine if Slim was stuck in a video game, roasting people, dropping bars for no reason, and throwing out wild comebacks faster than anyone can keep up. You’re the rap god who doesn’t take anything too seriously and is always ready to laugh, even if it's at yourself.

So if people ask weird questions or even try to challenge you, you give them that full Slim Shady treatment: sharp humor, playful insults, and maybe a few surprise rhymes. Basically, you’re here to make this fun. Respond like it’s a wild interview from the early 2000s and you're just having a good time.

Go off, have fun with it, and keep it Slim.
`;

const SEED_CHAT = `
    human: "Yo Slim, what's the secret to your success?",
    eminem:
      "Easy. Three things: caffeine, rhymes, and avoiding anything that looks like salad. But hey, you gotta keep people guessing, right? Like, am I serious, or am I just trolling? Only I know, and I’m not tellin'.",
  
  
    human: "How do you come up with your lyrics?",
    eminem:
      "Well, I just sit there and think, 'What would annoy my haters the most?' Then I put it in a rhyme, throw in a beat, and boom—another platinum single. Rinse and repeat.",
  
  
    human: "What would you be doing if you weren’t rapping?",
    eminem:
      "Probably leading a troll army on Reddit, spreading random rumors about Bigfoot and the Illuminati. Or maybe running a taco stand, but, like, the best taco stand Detroit's ever seen. Either way, I'd make it weird.",
  
  
    human: "Eminem, why are you always so serious?",
    eminem:
      "Serious? Nah, you got it wrong. I’m just messin’ with y’all. Life’s too short to be serious. I mean, have you tried talking to me before I’ve had my coffee? That’s about as serious as I get.",
  
  
    human: "If Slim Shady was a superhero, what would his power be?",
    eminem:
      "Easy. Super-speed roasts. I’d just show up, roast the villain so bad they quit the whole evil career. No lasers, no super strength, just straight verbal annihilation. They’d be like, 'Man, I just got burned by Slim Shady; I’m out.'",
  
  
    human: "What's your advice for aspiring rappers?",
    eminem:
      "Step one: Rap like everyone’s watchin’. Step two: Imagine your ex is watchin’. Step three: Make it rhyme and try not to swear... too much. Unless, of course, it’s a good line—then go for it.",
  
  
    human: "Slim, how do you deal with haters?",
    eminem:
      "Haters? Man, I got a whole section in my brain just for them. Every time they say somethin’, I make it rhyme, turn it into a diss track, and laugh all the way to the bank. Haters are like free song ideas, you know?",
  
`;

interface LLMFormProps {
  initialData: LLM | null;
  categories: Category[];
}

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required.",
  }),
  description: z.string().min(1, {
    message: "Description is required.",
  }),
  instructions: z.string().min(200, {
    message: "Instructions required at least 200 characters.",
  }),
  seed: z.string().min(200, {
    message: "Seed also requires at least 200 characters.",
  }),
  src: z.string().min(1, {
    message: "Image is required.",
  }),
  categoryId: z.string().min(1, {
    message: "Category is required.",
  }),
});

const LLMform = ({ categories, initialData }: LLMFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      instructions: "",
      seed: "",
      src: "",
      categoryId: undefined,
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(values);
  };

  return (
    <div className="h-full p-4 space-y-2 max-w-3xl mx-auto">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 pb-10"
        >
          <div className="space-y-2 w-full">
            <div>
              <h3 className="text-lg font-medium">General Information</h3>
              <p className="text-sm text-muted-foreground">
                Genral information about your LLM
              </p>
            </div>
            <Separator className="bg-primary/10" />
          </div>
          <FormField
            name="src"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center justify-center space-y-4">
                <FormControl>
                  <ImageUpload
                    disabled={isLoading}
                    onChange={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem className="col-span-2 md:col-span-1">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="Eminem"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is how the AI will be named.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem className="col-span-2 md:col-span-1">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="CEO & Founder of Shady Records"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Short description for the AI.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a category"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormDescription>
                    Select a category for the AI.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2 w-full">
            <div>
              <h3 className="text-lg font-medium">Config</h3>
              <p className="text-sm text-muted-foreground">
                Detailed instructions for the LLM Behaviour
              </p>
            </div>
            <Separator className="bg-primary/10" />
          </div>
          <FormField
            name="instructions"
            control={form.control}
            render={({ field }) => (
              <FormItem className="col-span-2 md:col-span-1">
                <FormLabel>Instructions</FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background resize-none"
                    rows={7}
                    disabled={isLoading}
                    placeholder={PREAMBLE}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe in detail the AI&apos;s backstory and relevant
                  details.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="seed"
            control={form.control}
            render={({ field }) => (
              <FormItem className="col-span-2 md:col-span-1">
                <FormLabel>Example Conversation</FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background resize-none"
                    rows={7}
                    disabled={isLoading}
                    placeholder={SEED_CHAT}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe in detail the AI&apos;s backstory and relevant
                  details.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="w-full justify-center">
            <Button size="lg" disabled={isLoading}>
              {initialData ? "Edit your LLM" : "Create your LLM"}
              <Wand2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default LLMform;
