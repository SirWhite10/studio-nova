package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/fatedier/frp/pkg/config"
	"github.com/fatedier/frp/pkg/nova/domaincontrol"
)

var novaCheckHost string

func init() {
	novaCheckCmd.Flags().StringVar(&novaCheckHost, "host", "", "hostname to authorize through Nova domain control")
	rootCmd.AddCommand(novaCheckCmd)
}

var novaCheckCmd = &cobra.Command{
	Use:   "nova-check",
	Short: "Check Nova direct SurrealDB domain authorization",
	RunE: func(cmd *cobra.Command, args []string) error {
		if cfgFile == "" {
			fmt.Println("frps nova-check: the configuration file is not specified")
			os.Exit(1)
		}
		if novaCheckHost == "" {
			fmt.Println("frps nova-check: --host is required")
			os.Exit(1)
		}

		svrCfg, _, err := config.LoadServerConfig(cfgFile, strictConfigMode)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		if !svrCfg.NovaDomainControl.Enable {
			fmt.Println("frps nova-check: novaDomainControl.enable is false")
			os.Exit(1)
		}
		if svrCfg.NovaDomainControl.Surreal.URL == "" {
			fmt.Println("frps nova-check: novaDomainControl.surreal.url is required for standalone frps")
			os.Exit(1)
		}

		client, err := domaincontrol.NewSurrealClient(domaincontrol.SurrealOptions{
			URL:              svrCfg.NovaDomainControl.Surreal.URL,
			Namespace:        svrCfg.NovaDomainControl.Surreal.Namespace,
			Database:         svrCfg.NovaDomainControl.Surreal.Database,
			Username:         svrCfg.NovaDomainControl.Surreal.Username,
			Password:         svrCfg.NovaDomainControl.Surreal.Password,
			ConnectTimeoutMS: svrCfg.NovaDomainControl.Surreal.ConnectTimeoutMS,
		})
		if err != nil {
			fmt.Printf("frps nova-check: %v\n", err)
			os.Exit(1)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := client.HostAllowed(ctx, novaCheckHost); err != nil {
			fmt.Printf("frps nova-check: host rejected: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("frps nova-check: host %s is active and allowed\n", novaCheckHost)
		return nil
	},
}
