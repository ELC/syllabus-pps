import { type Connect, type Plugin } from "vite";
import { DEFAULT_STORAGE_BUCKET } from "../src/index";
export interface SupabaseDevPluginOptions {
    repoRoot: string;
    pages?: boolean;
    resources?: boolean;
}
export declare function createSupabaseDevMiddleware(base: string, options: SupabaseDevPluginOptions): Connect.NextHandleFunction;
export declare function supabaseDevPlugin(options: SupabaseDevPluginOptions): Plugin;
export { DEFAULT_STORAGE_BUCKET };
