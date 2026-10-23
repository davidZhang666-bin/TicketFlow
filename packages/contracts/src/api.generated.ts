export interface paths {
    "/api/v1/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["liveness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["readiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create an eight-hour database session */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description At most 100 most recently created published events. */
        get: operations["listPublicEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPublicEvent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organizer/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listOwnedEvents"];
        put?: never;
        post: operations["createEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organizer/events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getOwnedEvent"];
        put: operations["updateDraftEvent"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/organizer/events/{id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["publishEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    liveness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    readiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                    password: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        user: {
                            /** Format: uuid */
                            id: string;
                            name: string;
                            /** Format: email */
                            email: string;
                            /** @enum {string} */
                            role: "USER" | "ORGANIZER";
                        };
                        csrfToken: string;
                    };
                };
            };
        };
    };
    getSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        user: {
                            /** Format: uuid */
                            id: string;
                            name: string;
                            /** Format: email */
                            email: string;
                            /** @enum {string} */
                            role: "USER" | "ORGANIZER";
                        };
                        csrfToken: string;
                    };
                };
            };
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    listPublicEvents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            title: string;
                            description: string;
                            location: string;
                            /** @enum {string} */
                            category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                            /** Format: date-time */
                            salesOpensAt: string;
                            /** Format: date-time */
                            salesClosesAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                            revision: number;
                            slots: {
                                label: string;
                                /** Format: date-time */
                                startsAt: string;
                                /** Format: date-time */
                                endsAt: string;
                                capacity: number;
                                priceCents: number;
                                /** Format: uuid */
                                id: string;
                                available: number;
                                held: number;
                                confirmed: number;
                            }[];
                        }[];
                    };
                };
            };
        };
    };
    getPublicEvent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        title: string;
                        description: string;
                        location: string;
                        /** @enum {string} */
                        category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                        /** Format: date-time */
                        salesOpensAt: string;
                        /** Format: date-time */
                        salesClosesAt: string;
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                        revision: number;
                        slots: {
                            label: string;
                            /** Format: date-time */
                            startsAt: string;
                            /** Format: date-time */
                            endsAt: string;
                            capacity: number;
                            priceCents: number;
                            /** Format: uuid */
                            id: string;
                            available: number;
                            held: number;
                            confirmed: number;
                        }[];
                    };
                };
            };
        };
    };
    listOwnedEvents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            title: string;
                            description: string;
                            location: string;
                            /** @enum {string} */
                            category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                            /** Format: date-time */
                            salesOpensAt: string;
                            /** Format: date-time */
                            salesClosesAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                            revision: number;
                            slots: {
                                label: string;
                                /** Format: date-time */
                                startsAt: string;
                                /** Format: date-time */
                                endsAt: string;
                                capacity: number;
                                priceCents: number;
                                /** Format: uuid */
                                id: string;
                                available: number;
                                held: number;
                                confirmed: number;
                            }[];
                        }[];
                    };
                };
            };
        };
    };
    createEvent: {
        parameters: {
            query?: never;
            header: {
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    title: string;
                    description: string;
                    location: string;
                    /** @enum {string} */
                    category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                    /** Format: date-time */
                    salesOpensAt: string;
                    /** Format: date-time */
                    salesClosesAt: string;
                    slots: {
                        label: string;
                        /** Format: date-time */
                        startsAt: string;
                        /** Format: date-time */
                        endsAt: string;
                        capacity: number;
                        priceCents: number;
                    }[];
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        title: string;
                        description: string;
                        location: string;
                        /** @enum {string} */
                        category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                        /** Format: date-time */
                        salesOpensAt: string;
                        /** Format: date-time */
                        salesClosesAt: string;
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                        revision: number;
                        slots: {
                            label: string;
                            /** Format: date-time */
                            startsAt: string;
                            /** Format: date-time */
                            endsAt: string;
                            capacity: number;
                            priceCents: number;
                            /** Format: uuid */
                            id: string;
                            available: number;
                            held: number;
                            confirmed: number;
                        }[];
                    };
                };
            };
        };
    };
    getOwnedEvent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        title: string;
                        description: string;
                        location: string;
                        /** @enum {string} */
                        category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                        /** Format: date-time */
                        salesOpensAt: string;
                        /** Format: date-time */
                        salesClosesAt: string;
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                        revision: number;
                        slots: {
                            label: string;
                            /** Format: date-time */
                            startsAt: string;
                            /** Format: date-time */
                            endsAt: string;
                            capacity: number;
                            priceCents: number;
                            /** Format: uuid */
                            id: string;
                            available: number;
                            held: number;
                            confirmed: number;
                        }[];
                    };
                };
            };
        };
    };
    updateDraftEvent: {
        parameters: {
            query?: never;
            header: {
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    title: string;
                    description: string;
                    location: string;
                    /** @enum {string} */
                    category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                    /** Format: date-time */
                    salesOpensAt: string;
                    /** Format: date-time */
                    salesClosesAt: string;
                    slots: {
                        label: string;
                        /** Format: date-time */
                        startsAt: string;
                        /** Format: date-time */
                        endsAt: string;
                        capacity: number;
                        priceCents: number;
                    }[];
                    expectedRevision: number;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        title: string;
                        description: string;
                        location: string;
                        /** @enum {string} */
                        category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                        /** Format: date-time */
                        salesOpensAt: string;
                        /** Format: date-time */
                        salesClosesAt: string;
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                        revision: number;
                        slots: {
                            label: string;
                            /** Format: date-time */
                            startsAt: string;
                            /** Format: date-time */
                            endsAt: string;
                            capacity: number;
                            priceCents: number;
                            /** Format: uuid */
                            id: string;
                            available: number;
                            held: number;
                            confirmed: number;
                        }[];
                    };
                };
            };
        };
    };
    publishEvent: {
        parameters: {
            query?: never;
            header: {
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedRevision: number;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        title: string;
                        description: string;
                        location: string;
                        /** @enum {string} */
                        category: "LECTURE" | "COMPETITION" | "PERFORMANCE";
                        /** Format: date-time */
                        salesOpensAt: string;
                        /** Format: date-time */
                        salesClosesAt: string;
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        status: "DRAFT" | "PUBLISHED" | "CANCELING" | "CANCELED";
                        revision: number;
                        slots: {
                            label: string;
                            /** Format: date-time */
                            startsAt: string;
                            /** Format: date-time */
                            endsAt: string;
                            capacity: number;
                            priceCents: number;
                            /** Format: uuid */
                            id: string;
                            available: number;
                            held: number;
                            confirmed: number;
                        }[];
                    };
                };
            };
        };
    };
}
