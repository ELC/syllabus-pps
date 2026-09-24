import { type Connect, type Plugin } from "vite";
import { DEFAULT_STORAGE_BUCKET } from "../src/index";
export interface SupabaseDevPluginOptions {
    repoRoot: string;
    pages?: boolean;
    resources?: boolean;
    roadmapLayouts?: boolean;
    planningPlans?: boolean;
}
export declare function createSupabaseDevMiddleware(base: string, options: SupabaseDevPluginOptions): Connect.NextHandleFunction;
export declare function supabaseDevPlugin(options: SupabaseDevPluginOptions): Plugin;
export declare function siteRoadmapLayoutDevPlugin(options: SupabaseDevPluginOptions): Plugin;
export declare function sitePlanningDevPlugin(options: SupabaseDevPluginOptions): Plugin;
/** @deprecated Use sitePlanningDevPlugin */
export declare function sitePlanningPlanDevPlugin(options: SupabaseDevPluginOptions): Plugin;
export { DEFAULT_STORAGE_BUCKET };
